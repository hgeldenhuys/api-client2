import type {
  OpenAPIDocument,
  OpenAPI30,
  Swagger20,
  OpenAPIDetectionResult,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIMediaType,
  OpenAPISchema,
  OpenAPISecurityScheme,
  SwaggerParameter,
  SwaggerOperation,
  SwaggerSecurityScheme,
} from "~/types/openapi";
import type {
  PostmanCollection,
  RequestItem,
  RequestAuth,
  Header,
  Variable,
} from "~/types/postman";

export class OpenAPIImporter {
  /**
   * Detects if the input is a valid OpenAPI/Swagger document
   */
  static detect(data: any): OpenAPIDetectionResult {
    const errors: string[] = [];

    if (!data || typeof data !== "object") {
      return {
        isOpenAPI: false,
        version: null,
        errors: ["Invalid JSON structure"],
      };
    }

    // Check for OpenAPI 3.x
    if (data.openapi && typeof data.openapi === "string") {
      const version = data.openapi;
      if (version.startsWith("3.0")) {
        return {
          isOpenAPI: true,
          version: "3.0",
          document: data as OpenAPI30,
        };
      } else if (version.startsWith("3.1")) {
        return {
          isOpenAPI: true,
          version: "3.1",
          document: data as OpenAPI30,
        };
      } else {
        errors.push(`Unsupported OpenAPI version: ${version}`);
      }
    }

    // Check for Swagger 2.0
    if (data.swagger === "2.0") {
      return {
        isOpenAPI: true,
        version: "2.0",
        document: data as Swagger20,
      };
    }

    // Check if it might be OpenAPI/Swagger but missing version
    if (data.info && data.paths) {
      errors.push(
        "Document appears to be OpenAPI/Swagger but missing version information",
      );
    }

    return {
      isOpenAPI: false,
      version: null,
      errors: errors.length > 0 ? errors : ["Not an OpenAPI/Swagger document"],
    };
  }

  /**
   * Validates OpenAPI/Swagger document structure
   */
  static validate(document: OpenAPIDocument): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!document.info) {
      errors.push("Missing required field: info");
    } else {
      if (!document.info.title) {
        errors.push("Missing required field: info.title");
      }
      if (!document.info.version) {
        errors.push("Missing required field: info.version");
      }
    }

    if (!document.paths || typeof document.paths !== "object") {
      errors.push("Missing or invalid field: paths");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Imports an OpenAPI/Swagger document and converts it to a Postman collection
   */
  static async import(jsonData: string | object): Promise<{
    success: boolean;
    collection?: PostmanCollection;
    error?: string;
    warnings?: string[];
  }> {
    try {
      // Parse JSON if string
      const data =
        typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;

      // Detect format
      const detection = this.detect(data);
      if (!detection.isOpenAPI || !detection.document) {
        return {
          success: false,
          error:
            detection.errors?.join(", ") ||
            "Not a valid OpenAPI/Swagger document",
        };
      }

      // Validate
      const validation = this.validate(detection.document);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
        };
      }

      // Convert to Postman collection
      const result = this.convertToPostmanCollection(
        detection.document,
        detection.version!,
      );

      return {
        success: true,
        collection: result.collection,
        warnings: result.warnings,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Imports from a File object
   */
  static async importFromFile(file: File): Promise<{
    success: boolean;
    collection?: PostmanCollection;
    error?: string;
    warnings?: string[];
  }> {
    try {
      const text = await file.text();

      // Try to parse as YAML if file extension suggests it
      if (file.name.endsWith(".yaml") || file.name.endsWith(".yml")) {
        // For now, we'll just try JSON parsing
        // In a real implementation, you'd use a YAML parser like js-yaml
        try {
          JSON.parse(text);
        } catch {
          return {
            success: false,
            error:
              "YAML parsing not implemented yet. Please convert to JSON format.",
          };
        }
      }

      return this.import(text);
    } catch (error) {
      return {
        success: false,
        error: "Failed to read file",
      };
    }
  }

  /**
   * Converts OpenAPI/Swagger document to Postman collection
   */
  private static convertToPostmanCollection(
    document: OpenAPIDocument,
    version: "2.0" | "3.0" | "3.1",
  ): { collection: PostmanCollection; warnings: string[] } {
    const warnings: string[] = [];
    const items: RequestItem[] = [];

    // Get base URL
    const baseUrl = this.getBaseUrl(document, version);
    if (!baseUrl) {
      warnings.push(
        "No base URL found. You may need to set the base URL manually.",
      );
    }

    // Convert paths to requests
    Object.entries(document.paths).forEach(([path, pathItem]) => {
      if (!pathItem || typeof pathItem !== "object" || "$ref" in pathItem) {
        return; // Skip references for now
      }

      // Process each HTTP method
      const methods = [
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "head",
        "options",
        "trace",
      ] as const;

      for (const method of methods) {
        const operation = pathItem[method];
        if (operation) {
          const request = this.convertOperationToRequest(
            method.toUpperCase(),
            path,
            operation,
            pathItem.parameters || [],
            baseUrl,
            document,
            version,
            warnings,
          );

          if (request) {
            items.push(request);
          }
        }
      }
    });

    // Create collection
    const collection: PostmanCollection = {
      info: {
        _postman_id: crypto.randomUUID(),
        name: document.info.title,
        description: document.info.description,
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: items,
    };

    // Add collection-level auth if available
    const auth = this.extractAuth(document, version);
    if (auth) {
      collection.auth = auth;
    }

    // Add variables
    const variables = this.extractVariables(document, version, baseUrl);
    if (variables.length > 0) {
      collection.variable = variables;
    }

    return { collection, warnings };
  }

  /**
   * Extracts base URL from the document
   */
  private static getBaseUrl(
    document: OpenAPIDocument,
    version: string,
  ): string | undefined {
    if (version === "2.0") {
      const swagger = document as Swagger20;
      if (swagger.host) {
        const scheme = swagger.schemes?.[0] || "https";
        const basePath = swagger.basePath || "";
        return `${scheme}://${swagger.host}${basePath}`;
      }
    } else {
      const openapi = document as OpenAPI30;
      if (openapi.servers && openapi.servers.length > 0) {
        return openapi.servers[0].url;
      }
    }
    return undefined;
  }

  /**
   * Converts an operation to a Postman request
   */
  private static convertOperationToRequest(
    method: string,
    path: string,
    operation: OpenAPIOperation | SwaggerOperation,
    pathParameters: any[],
    baseUrl: string | undefined,
    document: OpenAPIDocument,
    version: string,
    warnings: string[],
  ): RequestItem | null {
    try {
      // Build URL
      let url = path;
      if (baseUrl) {
        url = `${baseUrl}${path}`;
      }

      // Convert path parameters to Postman format
      url = url.replace(/{([^}]+)}/g, "{{$1}}");

      // Generate request name
      const name =
        operation.operationId || operation.summary || `${method} ${path}`;

      // Convert parameters
      const headers: Header[] = [];
      const queryParams: Array<{
        key: string;
        value: string;
        description?: string;
      }> = [];

      // Collect all parameters (path + operation)
      const allParameters = [
        ...pathParameters,
        ...(operation.parameters || []),
      ];

      for (const param of allParameters) {
        if ("$ref" in param) continue; // Skip references for now

        const parameter = param as OpenAPIParameter | SwaggerParameter;

        switch (parameter.in) {
          case "header":
            headers.push({
              key: parameter.name,
              value: this.generateExampleValue(parameter),
              description: parameter.description,
            });
            break;
          case "query":
            queryParams.push({
              key: parameter.name,
              value: this.generateExampleValue(parameter),
              description: parameter.description,
            });
            break;
          // Path parameters are already handled in URL template
        }
      }

      // Handle request body
      let body: any = undefined;
      if (version === "2.0") {
        const swaggerOp = operation as SwaggerOperation;
        const bodyParam = swaggerOp.parameters?.find(
          (p) => !("$ref" in p) && (p as SwaggerParameter).in === "body",
        ) as SwaggerParameter | undefined;

        if (bodyParam?.schema) {
          body = {
            mode: "raw",
            raw: this.generateExampleFromSchema(
              bodyParam.schema,
              version,
              document,
            ),
          };

          // Add content-type header
          const contentType = swaggerOp.consumes?.[0] || "application/json";
          headers.push({
            key: "Content-Type",
            value: contentType,
          });
        }
      } else {
        const openApiOp = operation as OpenAPIOperation;
        if (openApiOp.requestBody && !("$ref" in openApiOp.requestBody)) {
          const requestBody = openApiOp.requestBody as OpenAPIRequestBody;
          const contentTypes = Object.keys(requestBody.content);

          if (contentTypes.length > 0) {
            const contentType = contentTypes[0];
            const mediaType = requestBody.content[contentType];

            body = {
              mode: "raw",
              raw: this.generateExampleFromMediaType(
                mediaType,
                version,
                document,
              ),
            };

            headers.push({
              key: "Content-Type",
              value: contentType,
            });
          }
        }
      }

      // Create the request
      const request: RequestItem = {
        id: crypto.randomUUID(),
        name,
        request: {
          method: method as any,
          header: headers,
          url: {
            raw: url,
            protocol: undefined,
            host: undefined,
            path: undefined,
            query: queryParams,
            variable: [],
          },
          body,
          description: operation.description,
        },
      };

      return request;
    } catch (error) {
      warnings.push(`Failed to convert operation ${method} ${path}: ${error}`);
      return null;
    }
  }

  /**
   * Generates example value for a parameter
   */
  private static generateExampleValue(
    parameter: OpenAPIParameter | SwaggerParameter,
  ): string {
    // Check for explicit example
    if ("example" in parameter && parameter.example !== undefined) {
      return String(parameter.example);
    }

    // Generate from schema/type
    if ("schema" in parameter && parameter.schema) {
      return this.generateExampleFromSchema(parameter.schema, "3.0", null);
    }

    if ("type" in parameter && parameter.type) {
      switch (parameter.type) {
        case "string":
          return parameter.enum?.[0] || "string";
        case "integer":
        case "number":
          return String(parameter.default || 0);
        case "boolean":
          return String(parameter.default || false);
        case "array":
          return "[]";
        default:
          return "";
      }
    }

    return "";
  }

  /**
   * Generates example JSON from schema
   */
  private static generateExampleFromSchema(
    schema: any,
    version: string,
    document: OpenAPIDocument | null,
  ): string {
    if (!schema) return "{}";

    try {
      const example = this.generateExampleObject(
        schema,
        version,
        document,
        new Set(),
      );
      return JSON.stringify(example, null, 2);
    } catch {
      return "{}";
    }
  }

  /**
   * Generates example from media type
   */
  private static generateExampleFromMediaType(
    mediaType: OpenAPIMediaType,
    version: string,
    document: OpenAPIDocument,
  ): string {
    // Check for explicit example
    if (mediaType.example !== undefined) {
      return typeof mediaType.example === "string"
        ? mediaType.example
        : JSON.stringify(mediaType.example, null, 2);
    }

    // Check for examples
    if (mediaType.examples) {
      const firstExample = Object.values(mediaType.examples)[0];
      if (
        firstExample &&
        !("$ref" in firstExample) &&
        firstExample.value !== undefined
      ) {
        return typeof firstExample.value === "string"
          ? firstExample.value
          : JSON.stringify(firstExample.value, null, 2);
      }
    }

    // Generate from schema
    if (mediaType.schema) {
      return this.generateExampleFromSchema(
        mediaType.schema,
        version,
        document,
      );
    }

    return "{}";
  }

  /**
   * Recursively generates example objects from schemas
   */
  private static generateExampleObject(
    schema: any,
    version: string,
    document: OpenAPIDocument | null,
    visited: Set<string>,
  ): any {
    if (!schema) return null;

    // Handle references
    if ("$ref" in schema) {
      const refKey = schema.$ref;
      if (visited.has(refKey)) {
        return {}; // Prevent infinite recursion
      }
      visited.add(refKey);

      // TODO: Resolve reference from document
      // For now, return empty object
      return {};
    }

    // Check for explicit example
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Handle by type
    switch (schema.type) {
      case "object":
        const obj: any = {};
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([key, propSchema]) => {
            obj[key] = this.generateExampleObject(
              propSchema,
              version,
              document,
              visited,
            );
          });
        }
        return obj;

      case "array":
        if (schema.items) {
          return [
            this.generateExampleObject(
              schema.items,
              version,
              document,
              visited,
            ),
          ];
        }
        return [];

      case "string":
        if (schema.enum && schema.enum.length > 0) {
          return schema.enum[0];
        }
        switch (schema.format) {
          case "date":
            return "2023-01-01";
          case "date-time":
            return "2023-01-01T00:00:00.000Z";
          case "email":
            return "user@example.com";
          case "uri":
            return "https://example.com";
          case "uuid":
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
          default:
            return schema.default || "string";
        }

      case "number":
      case "integer":
        return schema.default || 0;

      case "boolean":
        return schema.default || false;

      case "null":
        return null;

      default:
        return schema.default || null;
    }
  }

  /**
   * Extracts authentication from the document
   */
  private static extractAuth(
    document: OpenAPIDocument,
    version: string,
  ): RequestAuth | undefined {
    // This is a simplified implementation
    // In a real implementation, you'd handle multiple security schemes

    if (version === "2.0") {
      const swagger = document as Swagger20;
      if (swagger.securityDefinitions) {
        const firstSecurity = Object.values(
          swagger.securityDefinitions,
        )[0] as SwaggerSecurityScheme;
        return this.convertSwaggerAuthToPostman(firstSecurity);
      }
    } else {
      const openapi = document as OpenAPI30;
      if (openapi.components?.securitySchemes) {
        const firstSecurity = Object.values(
          openapi.components.securitySchemes,
        )[0];
        if (!("$ref" in firstSecurity)) {
          return this.convertOpenAPIAuthToPostman(
            firstSecurity as OpenAPISecurityScheme,
          );
        }
      }
    }

    return undefined;
  }

  /**
   * Converts Swagger 2.0 auth to Postman auth
   */
  private static convertSwaggerAuthToPostman(
    security: SwaggerSecurityScheme,
  ): RequestAuth {
    switch (security.type) {
      case "basic":
        return {
          type: "basic",
          basic: [
            { key: "username", value: "", type: "string" as const },
            { key: "password", value: "", type: "string" as const },
          ],
        };

      case "apiKey":
        return {
          type: "apikey",
          apikey: [
            { key: "key", value: security.name || "X-API-Key", type: "string" },
            { key: "value", value: "", type: "string" },
            { key: "in", value: security.in || "header", type: "string" },
          ],
        };

      case "oauth2":
        return {
          type: "oauth2",
          oauth2: [
            {
              key: "authUrl",
              value: security.authorizationUrl || "",
              type: "string",
            },
            {
              key: "accessTokenUrl",
              value: security.tokenUrl || "",
              type: "string",
            },
          ],
        };

      default:
        return { type: "noauth" };
    }
  }

  /**
   * Converts OpenAPI 3.0 auth to Postman auth
   */
  private static convertOpenAPIAuthToPostman(
    security: OpenAPISecurityScheme,
  ): RequestAuth {
    switch (security.type) {
      case "http":
        if (security.scheme === "basic") {
          return {
            type: "basic",
            basic: [
              { key: "username", value: "", type: "string" },
              { key: "password", value: "", type: "string" },
            ],
          };
        } else if (security.scheme === "bearer") {
          return {
            type: "bearer",
            bearer: [{ key: "token", value: "", type: "string" }],
          };
        }
        break;

      case "apiKey":
        return {
          type: "apikey",
          apikey: [
            { key: "key", value: security.name || "X-API-Key", type: "string" },
            { key: "value", value: "", type: "string" },
            { key: "in", value: security.in || "header", type: "string" },
          ],
        };

      case "oauth2":
        // Simplified OAuth2 handling
        return {
          type: "oauth2",
          oauth2: [{ key: "accessToken", value: "", type: "string" }],
        };

      case "openIdConnect":
        return {
          type: "oauth2",
          oauth2: [
            {
              key: "openIdConnectUrl",
              value: security.openIdConnectUrl || "",
              type: "string",
            },
          ],
        };
    }

    return { type: "noauth" };
  }

  /**
   * Extracts variables from the document
   */
  private static extractVariables(
    document: OpenAPIDocument,
    version: string,
    baseUrl?: string,
  ): Variable[] {
    const variables: Variable[] = [];

    // Add base URL as variable
    if (baseUrl) {
      variables.push({
        key: "baseUrl",
        value: baseUrl,
        type: "string" as const,
      });
    }

    // Extract server variables (OpenAPI 3.0+)
    if (version !== "2.0") {
      const openapi = document as OpenAPI30;
      if (openapi.servers) {
        openapi.servers.forEach((server, index) => {
          if (server.variables) {
            Object.entries(server.variables).forEach(([key, variable]) => {
              variables.push({
                key: `server${index}_${key}`,
                value: variable.default,
                type: "string" as const,
              });
            });
          }
        });
      }
    }

    return variables;
  }
}
