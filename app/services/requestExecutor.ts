import { Request as PostmanRequest, Header, Auth } from "~/types/postman";
import { RequestExecution } from "~/types/request";
import { useEnvironmentStore } from "~/stores/environmentStore";
import { useRequestStore } from "~/stores/requestStore";
import { useProxyStore } from "~/stores/proxyStore";
import { useAuthStore } from "~/stores/authStore";
import { getScriptExecutor } from "./scriptExecutor";
import { VariableResolver, type VariableContext } from "./variableResolver";
import type { FormDataParameter, AuthContext } from "~/types/script";

interface RequestOptions {
  request: PostmanRequest;
  collectionAuth?: Auth;
  collectionVariables?: Record<string, string>;
  preRequestScript?: string;
  testScript?: string;
  signal?: AbortSignal;
}

export class RequestExecutor {
  async execute(options: RequestOptions): Promise<RequestExecution> {
    const {
      request,
      collectionAuth,
      collectionVariables = {},
      preRequestScript,
      testScript,
      signal,
    } = options;
    const envStore = useEnvironmentStore.getState();
    const authStore = useAuthStore.getState();

    // Ensure store is initialized
    if (!envStore.isInitialized) {
      await envStore.init();
    }

    // Create execution context
    const executionId = `exec-${Date.now()}`;
    const startTime = Date.now();

    // Build variable context using store methods to ensure fresh state
    const context = this.buildVariableContext(envStore, collectionVariables);

    // Declare targetUrl for error handling scope
    let targetUrl = "";

    try {
      // Process entire request with variables
      const processedRequest = VariableResolver.resolveRequest(
        request,
        context,
      );

      // Apply authentication with caching
      const requestId = `${options.request.url}-${options.request.method}`;
      let effectiveAuth = processedRequest.auth ?? collectionAuth;

      // Store auth credentials for reuse
      if (effectiveAuth) {
        authStore.storeCredentials(requestId, effectiveAuth);
      }

      const authResult = this.processAuth(effectiveAuth, context, requestId);

      // Merge headers
      const processedHeaders = this.mergeHeaders(
        processedRequest.header ?? [],
        authResult.headers,
      );

      // Apply auth query parameters if any
      if (authResult.queryParams) {
        const url = new URL(processedRequest.url);
        Object.entries(authResult.queryParams).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
        processedRequest.url = url.toString();
      }

      // Create request context for scripts
      const requestContext = {
        url:
          typeof processedRequest.url === "string"
            ? processedRequest.url
            : (processedRequest.url?.raw ?? ""),
        method: processedRequest.method,
        headers: processedHeaders,
        body: processedRequest.body?.raw ?? "",
        auth: effectiveAuth,
      };

      // Execute pre-request script if exists
      let preRequestResults: any = undefined;
      if (preRequestScript) {
        try {
          const scriptExecutor = getScriptExecutor();

          // Build script context with proper variable scoping
          const allVariables = envStore.resolveAllVariables();

          // Get global variables directly from store to avoid Map serialization issues
          const globals: Record<string, string> = {};
          if (
            envStore.globalVariables &&
            Array.isArray(envStore.globalVariables)
          ) {
            envStore.globalVariables.forEach((variable) => {
              if (variable.enabled) {
                globals[variable.key] = variable.value;
              }
            });
          }

          const scriptContext = {
            request: requestContext,
            environment: allVariables,
            collectionVariables,
            globals,
          };

          preRequestResults = await scriptExecutor.executePreRequestScript(
            preRequestScript,
            scriptContext,
          );

          // Store pre-request script results (including any errors)
          const requestStore = useRequestStore.getState();
          requestStore.setPreRequestScriptResult(preRequestResults);

          // Apply request modifications from pre-request script
          if (preRequestResults.requestUpdates) {
            const updates = preRequestResults.requestUpdates;

            // Update URL
            if (updates.url !== undefined) {
              requestContext.url = updates.url;
            }

            // Update method
            if (updates.method !== undefined) {
              requestContext.method = updates.method;
              processedRequest.method = updates.method;
            }

            // Update headers
            if (updates.headers) {
              console.log(
                "Applying header updates from pre-request script:",
                updates.headers,
              );
              Object.entries(updates.headers).forEach(([key, value]) => {
                if (value === null || value === undefined) {
                  // Remove header
                  delete processedHeaders[key];
                } else {
                  // Add or update header
                  processedHeaders[key] = String(value);
                }
              });
              requestContext.headers = processedHeaders;
              console.log(
                "Headers after pre-request script:",
                processedHeaders,
              );
            }

            // Update body
            if (updates.body !== undefined) {
              requestContext.body = updates.body;
            }

            // Update auth
            if (updates.auth !== undefined) {
              if (updates.auth === null) {
                // Remove auth
                effectiveAuth = undefined;
              } else {
                // Update auth
                effectiveAuth = updates.auth;
                requestContext.auth = updates.auth;
              }
            }
          }
        } catch (error) {
          console.error("Pre-request script error:", error);

          // Store the error in the script result so it's visible to the user
          const errorResult = {
            tests: [],
            consoleOutput: [
              `[ERROR] ${error instanceof Error ? error.message : String(error)}`,
            ],
            error: error instanceof Error ? error.message : String(error),
          };
          preRequestResults = errorResult;
          const requestStore = useRequestStore.getState();
          requestStore.setPreRequestScriptResult(errorResult);

          // Continue with request even if script fails
        }
      }

      // Re-process auth if it was updated by script
      if (preRequestResults?.requestUpdates?.auth !== undefined) {
        const newAuthResult = this.processAuth(
          effectiveAuth,
          context,
          requestId,
        );

        // Update headers with new auth
        Object.assign(processedHeaders, newAuthResult.headers);

        // Update query params if auth adds them
        if (newAuthResult.queryParams) {
          const url = new URL(requestContext.url);
          Object.entries(newAuthResult.queryParams).forEach(([key, value]) => {
            url.searchParams.set(key, value);
          });
          requestContext.url = url.toString();
        }
      }

      // Prepare fetch options with potentially modified values
      const fetchOptions: RequestInit = {
        method: requestContext.method, // Use potentially modified method
        headers: processedHeaders,
        signal: signal,
        mode: "cors",
        credentials: "omit", // Will be 'include' when we add cookie support
      };

      // Add body if not GET/HEAD
      if (
        !["GET", "HEAD"].includes(requestContext.method) &&
        processedRequest.body
      ) {
        const bodyConfig = processedRequest.body;

        switch (bodyConfig.mode) {
          case "raw": {
            fetchOptions.body = requestContext.body ?? bodyConfig.raw;
            if (!processedHeaders["content-type"]) {
              processedHeaders["content-type"] = "application/json";
            }
            break;
          }

          case "form-data": {
            if (bodyConfig.formdata) {
              const formData = new FormData();
              bodyConfig.formdata.forEach((param: FormDataParameter) => {
                if (param.type === "file" && param.src) {
                  // File handling would require actual file objects
                  // For now, we'll treat as text
                  formData.append(param.key, param.src);
                } else {
                  formData.append(param.key, param.value as string);
                }
              });
              fetchOptions.body = formData;
              // Don't set content-type for FormData - browser will set it with boundary
            }
            break;
          }

          case "urlencoded": {
            fetchOptions.body = bodyConfig.raw;
            if (!processedHeaders["content-type"]) {
              processedHeaders["content-type"] =
                "application/x-www-form-urlencoded";
            }
            break;
          }

          default:
            if (requestContext.body) {
              fetchOptions.body =
                typeof requestContext.body === "string"
                  ? requestContext.body
                  : JSON.stringify(requestContext.body);
            }
        }
      }

      // Update targetUrl for error handling
      targetUrl = requestContext.url;

      // Check if proxy is enabled
      const proxyStore = useProxyStore.getState();
      let fetchUrl = targetUrl;

      if (proxyStore.isEnabled && proxyStore.proxyUrl) {
        // Route through proxy
        fetchUrl = proxyStore.proxyUrl;

        // Add target URL header
        fetchOptions.headers = {
          ...fetchOptions.headers,
          "X-Target-URL": targetUrl,
        };

        // Add proxy authentication if configured
        if (proxyStore.username && proxyStore.password) {
          const auth = btoa(`${proxyStore.username}:${proxyStore.password}`);
          (fetchOptions.headers as any)["Proxy-Authorization"] =
            `Basic ${auth}`;
        }
      }

      // Execute the request
      const response = await fetch(fetchUrl, fetchOptions);
      const duration = Date.now() - startTime;

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Get response body
      let responseBody: any;
      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        responseBody = await response.json();
      } else if (contentType.includes("text/")) {
        responseBody = await response.text();
      } else {
        // For binary data, convert to base64
        const blob = await response.blob();
        responseBody = await this.blobToBase64(blob);
      }

      // Calculate response size
      const size = new Blob([JSON.stringify(responseBody)]).size;

      // Create execution result
      const execution: RequestExecution = {
        id: executionId,
        requestId: "",
        timestamp: startTime,
        duration,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        size,
      };

      // Execute test script if exists
      if (testScript) {
        try {
          const scriptExecutor = getScriptExecutor();

          // Build script context with proper variable scoping
          const allVariables = envStore.resolveAllVariables();

          // Get global variables directly from store to avoid Map serialization issues
          const globals: Record<string, string> = {};
          if (
            envStore.globalVariables &&
            Array.isArray(envStore.globalVariables)
          ) {
            envStore.globalVariables.forEach((variable) => {
              if (variable.enabled) {
                globals[variable.key] = variable.value;
              }
            });
          }

          const scriptContext = {
            request: requestContext,
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: responseHeaders,
              body: responseBody,
              time: duration,
            },
            environment: allVariables,
            collectionVariables,
            globals,
          };

          const testResults = await scriptExecutor.executeTestScript(
            testScript,
            scriptContext,
          );

          // Store test results in the request store
          const requestStore = useRequestStore.getState();
          requestStore.setTestScriptResult(testResults);
        } catch (error) {
          console.error("Test script error:", error);
        }
      }

      return execution;
    } catch (error) {
      // Handle request errors
      const duration = Date.now() - startTime;

      // Check for CORS errors
      let errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      let isCorsError = false;

      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        // This is likely a CORS error
        isCorsError = true;
        errorMessage =
          "Request blocked by CORS policy. Enable the proxy in Settings to bypass CORS restrictions.";

        // Auto-suggest proxy if enabled in settings
        const proxyStore = useProxyStore.getState();
        if (proxyStore.autoDetectCors && !proxyStore.isEnabled) {
          // Store CORS error state for UI to handle
          const requestStore = useRequestStore.getState();
          requestStore.setLastCorsError({
            url: targetUrl,
            timestamp: Date.now(),
          });
        }
      }

      const execution: RequestExecution = {
        id: executionId,
        requestId: "",
        timestamp: startTime,
        duration,
        status: 0,
        statusText: isCorsError ? "CORS Error" : "Request Failed",
        headers: {},
        body: null,
        size: 0,
        error: errorMessage,
        isCorsError,
      };

      return execution;
    }
  }

  private buildVariableContext(
    envStore: ReturnType<typeof useEnvironmentStore.getState>,
    collectionVariables: Record<string, string>,
  ): VariableContext {
    // Use the store's resolveAllVariables method which handles all the Map/serialization issues
    const allVariables = envStore.resolveAllVariables();

    // Get active environment - handle both Map and potential serialization issues
    let activeEnv = null;
    if (envStore.activeEnvironmentId) {
      // Try Map.get first
      if (
        envStore.environments &&
        typeof envStore.environments.get === "function"
      ) {
        activeEnv = envStore.environments.get(envStore.activeEnvironmentId);
      } else if (envStore.environments) {
        // Fallback to object access if environments is not a proper Map
        activeEnv = (envStore.environments as any)[
          envStore.activeEnvironmentId
        ];
        // If it's still an object-like structure, try to iterate
        if (!activeEnv && typeof envStore.environments === "object") {
          const envs = Object.values(envStore.environments);
          activeEnv = envs.find(
            (env: any) => env?.id === envStore.activeEnvironmentId,
          );
        }
      }
    }

    // Get global variables directly
    const globals: Record<string, string> = {};
    if (envStore.globalVariables && Array.isArray(envStore.globalVariables)) {
      envStore.globalVariables.forEach((variable) => {
        if (variable.enabled) {
          globals[variable.key] = variable.value;
        }
      });
    }

    const context: VariableContext = {
      collection: collectionVariables,
      environment: activeEnv?.values ?? {},
      secrets: activeEnv?.secrets ?? {},
      globals,
    };

    return context;
  }

  private mergeHeaders(
    headers: Header[],
    authHeaders: Record<string, string>,
  ): Record<string, string> {
    const processedHeaders: Record<string, string> = {};

    // Add regular headers
    headers.forEach((header) => {
      if (!header.disabled) {
        processedHeaders[header.key] = header.value;
      }
    });

    // Merge auth headers (they override regular headers)
    Object.assign(processedHeaders, authHeaders);

    return processedHeaders;
  }

  private processAuth(
    auth: Auth | undefined,
    context: VariableContext,
    requestId?: string,
  ): { headers: Record<string, string>; queryParams?: Record<string, string> } {
    if (!auth) {
      return { headers: {} };
    }

    const headers: Record<string, string> = {};
    const queryParams: Record<string, string> = {};

    switch (auth.type) {
      case "bearer": {
        const token =
          auth.bearer?.find((item) => item.key === "token")?.value ?? "";
        const resolvedToken = VariableResolver.resolve(token, context);
        if (resolvedToken) {
          headers["Authorization"] = `Bearer ${resolvedToken}`;
        }
        break;
      }

      case "basic": {
        const username =
          auth.basic?.find((item) => item.key === "username")?.value ?? "";
        const password =
          auth.basic?.find((item) => item.key === "password")?.value ?? "";
        const resolvedUsername = VariableResolver.resolve(username, context);
        const resolvedPassword = VariableResolver.resolve(password, context);

        if (resolvedUsername || resolvedPassword) {
          const credentials = btoa(`${resolvedUsername}:${resolvedPassword}`);
          headers["Authorization"] = `Basic ${credentials}`;
        }
        break;
      }

      case "apikey": {
        const apiKeyItem = auth.apikey?.find((item) => item.key === "key");
        const apiValueItem = auth.apikey?.find((item) => item.key === "value");
        const apiInItem = auth.apikey?.find((item) => item.key === "in");

        if (apiKeyItem && apiValueItem) {
          const key = VariableResolver.resolve(apiKeyItem.value, context);
          const value = VariableResolver.resolve(apiValueItem.value, context);
          const location = apiInItem?.value ?? "header";

          if (key && value) {
            if (location === "header") {
              headers[key] = value;
            } else if (location === "query") {
              queryParams[key] = value;
            }
          }
        }
        break;
      }

      case "jwt": {
        const jwtToken =
          auth.jwt?.find((item) => item.key === "token")?.value ?? "";
        const jwtPrefix =
          auth.jwt?.find((item) => item.key === "prefix")?.value ?? "Bearer";
        const resolvedJwtToken = VariableResolver.resolve(jwtToken, context);
        if (resolvedJwtToken) {
          headers["Authorization"] = `${jwtPrefix} ${resolvedJwtToken}`;
        }
        break;
      }

      case "oauth2": {
        const accessToken =
          auth.oauth2?.find((item) => item.key === "accessToken")?.value ?? "";
        const clientId =
          auth.oauth2?.find((item) => item.key === "clientId")?.value ?? "";
        const resolvedClientId = VariableResolver.resolve(clientId, context);

        // Try to get cached OAuth2 token first
        const authStore = useAuthStore.getState();
        const cachedToken = resolvedClientId
          ? authStore.getOAuth2Token(resolvedClientId)
          : undefined;

        if (cachedToken?.accessToken) {
          headers["Authorization"] =
            `${cachedToken.tokenType ?? "Bearer"} ${cachedToken.accessToken}`;
        } else {
          // Fall back to provided access token
          const resolvedAccessToken = VariableResolver.resolve(
            accessToken,
            context,
          );
          if (resolvedAccessToken) {
            headers["Authorization"] = `Bearer ${resolvedAccessToken}`;

            // Store token for future use if we have a client ID
            if (resolvedClientId) {
              authStore.storeOAuth2Token(resolvedClientId, {
                accessToken: resolvedAccessToken,
                tokenType: "Bearer",
              });
            }
          }
        }
        break;
      }

      case "oauth1": {
        // OAuth 1.0 requires signature generation which is complex
        // For now, we'll add a placeholder
        console.warn("OAuth 1.0 authentication not fully implemented yet");
        // TODO: Implement OAuth 1.0 signature generation
        break;
      }

      case "awsv4": {
        // AWS Signature v4 is complex and requires request signing
        console.warn(
          "AWS Signature v4 authentication not fully implemented yet",
        );
        // TODO: Implement AWS v4 signature
        break;
      }

      case "digest": {
        // Digest auth requires challenge-response flow
        console.warn("Digest authentication not fully implemented yet");
        // TODO: Implement Digest auth
        break;
      }

      case "hawk": {
        // Hawk authentication requires MAC generation
        console.warn("Hawk authentication not fully implemented yet");
        // TODO: Implement Hawk auth
        break;
      }

      case "ntlm": {
        // NTLM requires challenge-response flow
        console.warn("NTLM authentication not fully implemented yet");
        // TODO: Implement NTLM auth
        break;
      }

      case "custom": {
        const headerName =
          auth.custom?.find((item) => item.key === "headerName")?.value ??
          "Authorization";
        const headerValue =
          auth.custom?.find((item) => item.key === "headerValue")?.value ?? "";
        const resolvedHeaderName = VariableResolver.resolve(
          headerName,
          context,
        );
        const resolvedHeaderValue = VariableResolver.resolve(
          headerValue,
          context,
        );
        if (resolvedHeaderName && resolvedHeaderValue) {
          headers[resolvedHeaderName] = resolvedHeaderValue;
        }
        break;
      }
    }

    return {
      headers,
      queryParams:
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
    };
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Singleton instance
export const requestExecutor = new RequestExecutor();
