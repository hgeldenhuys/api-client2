import type {
  HTTPFile,
  HTTPRequest,
  HTTPFileParseResult,
  HTTPParseError,
  HTTPParseWarning,
  HTTPMethod,
  HTTPHeader,
  HTTPRequestBody,
  HTTPParseContext,
  HTTPFileValidationResult,
} from "~/types/http";
import type { PostmanCollection, RequestItem } from "~/types/postman";

export class HTTPFileImporter {
  /**
   * Parses HTTP file content and converts to internal format
   */
  static parse(content: string, filename?: string): HTTPFileParseResult {
    const context: HTTPParseContext = {
      filename,
      currentLine: 1,
      currentColumn: 1,
      variables: {},
      strict: false,
    };

    const errors: HTTPParseError[] = [];
    const warnings: HTTPParseWarning[] = [];

    try {
      const requests = this.parseHTTPContent(
        content,
        context,
        errors,
        warnings,
      );

      const httpFile: HTTPFile = {
        requests,
        variables:
          Object.keys(context.variables).length > 0
            ? context.variables
            : undefined,
        metadata: {
          filename,
          created: new Date().toISOString(),
          description: `Imported from ${filename || "HTTP file"}`,
        },
      };

      return {
        success: errors.length === 0,
        file: httpFile,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      errors.push({
        message:
          error instanceof Error ? error.message : "Unknown parsing error",
        severity: "error",
      });

      return {
        success: false,
        errors,
      };
    }
  }

  /**
   * Imports from a File object
   */
  static async importFromFile(file: File): Promise<HTTPFileParseResult> {
    try {
      const content = await file.text();
      return this.parse(content, file.name);
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            message: "Failed to read file",
            severity: "error",
          },
        ],
      };
    }
  }

  /**
   * Converts HTTP file to Postman collection
   */
  static convertToPostmanCollection(httpFile: HTTPFile): PostmanCollection {
    const items: RequestItem[] = [];

    httpFile.requests.forEach((httpRequest, index) => {
      const postmanRequest = this.convertHTTPRequestToPostman(
        httpRequest,
        httpFile.variables,
      );
      if (postmanRequest) {
        items.push(postmanRequest);
      }
    });

    const collection: PostmanCollection = {
      info: {
        _postman_id: crypto.randomUUID(),
        name:
          httpFile.metadata?.filename?.replace(/\.[^/.]+$/, "") ||
          "Imported HTTP Requests",
        description:
          httpFile.metadata?.description || "Imported from HTTP file",
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: items,
    };

    // Add variables
    if (httpFile.variables) {
      collection.variable = Object.entries(httpFile.variables).map(
        ([key, value]) => ({
          key,
          value,
          type: "string",
        }),
      );
    }

    return collection;
  }

  /**
   * Validates HTTP file structure
   */
  static validate(httpFile: HTTPFile): HTTPFileValidationResult {
    const errors: HTTPParseError[] = [];
    const warnings: HTTPParseWarning[] = [];
    const duplicateNames: string[] = [];
    const missingVariables: string[] = [];

    // Check for duplicate request names
    const names = new Set<string>();
    httpFile.requests.forEach((request) => {
      if (request.name) {
        if (names.has(request.name)) {
          duplicateNames.push(request.name);
        }
        names.add(request.name);
      }
    });

    // Check for missing variables
    const definedVariables = new Set(Object.keys(httpFile.variables || {}));
    const usedVariables = new Set<string>();

    httpFile.requests.forEach((request) => {
      // Check URL for variables
      this.extractVariables(request.url).forEach((v) => usedVariables.add(v));

      // Check headers for variables
      request.headers?.forEach((header) => {
        this.extractVariables(header.value).forEach((v) =>
          usedVariables.add(v),
        );
      });

      // Check body for variables
      if (request.body) {
        this.extractVariables(request.body.content).forEach((v) =>
          usedVariables.add(v),
        );
      }
    });

    usedVariables.forEach((variable) => {
      if (!definedVariables.has(variable)) {
        missingVariables.push(variable);
      }
    });

    // Add warnings for missing variables
    if (missingVariables.length > 0) {
      warnings.push({
        message: `Undefined variables used: ${missingVariables.join(", ")}`,
        suggestion: "Define these variables in the environment or file header",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      requestCount: httpFile.requests.length,
      variableCount: Object.keys(httpFile.variables || {}).length,
      duplicateNames: duplicateNames.length > 0 ? duplicateNames : undefined,
      missingVariables:
        missingVariables.length > 0 ? missingVariables : undefined,
    };
  }

  /**
   * Parses HTTP file content into requests
   */
  private static parseHTTPContent(
    content: string,
    context: HTTPParseContext,
    errors: HTTPParseError[],
    warnings: HTTPParseWarning[],
  ): HTTPRequest[] {
    const requests: HTTPRequest[] = [];
    const lines = content.split(/\r?\n/);

    let currentRequest: Partial<HTTPRequest> | null = null;
    let currentSection: "request" | "headers" | "body" | "variables" =
      "request";
    let bodyLines: string[] = [];
    let inMultilineComment = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      context.currentLine = i + 1;
      context.currentColumn = 1;

      const trimmedLine = line.trim();

      // Handle empty lines - in HTTP format, empty line after headers signals start of body
      if (!trimmedLine) {
        if (currentSection === "headers") {
          // Empty line after headers - transition to body
          currentSection = "body";
        } else if (currentSection === "body" && bodyLines.length > 0) {
          // Preserve empty lines within body
          bodyLines.push("");
        }
        continue;
      }

      // Handle comments
      if (trimmedLine.startsWith("#") || trimmedLine.startsWith("//")) {
        // Handle variable definitions in comments
        if (trimmedLine.includes("=")) {
          this.parseVariableDefinition(trimmedLine, context, warnings);
        }
        continue;
      }

      // Handle request separator
      if (trimmedLine.startsWith("###")) {
        // Save current request if it exists
        if (currentRequest && this.isValidRequest(currentRequest)) {
          this.finalizeRequest(
            currentRequest,
            bodyLines,
            requests,
            context,
            errors,
          );
        }

        // Start new request
        currentRequest = this.initializeNewRequest(trimmedLine, context);
        currentSection = "request";
        bodyLines = [];
        continue;
      }

      // Parse request line (METHOD URL)
      if (currentSection === "request" && this.isHTTPRequestLine(trimmedLine)) {
        if (!currentRequest) {
          currentRequest = this.initializeNewRequest(null, context);
        }

        const parsed = this.parseRequestLine(trimmedLine, context, errors);
        if (parsed) {
          currentRequest.method = parsed.method;
          currentRequest.url = parsed.url;
          currentSection = "headers";
        }
        continue;
      }

      // Parse headers
      if (currentSection === "headers" || currentSection === "request") {
        if (this.isHeaderLine(trimmedLine)) {
          if (!currentRequest) {
            currentRequest = this.initializeNewRequest(null, context);
          }

          const header = this.parseHeaderLine(trimmedLine, context, errors);
          if (header) {
            if (!currentRequest.headers) {
              currentRequest.headers = [];
            }
            currentRequest.headers.push(header);
          }
          currentSection = "headers";
          continue;
        } else if (currentSection === "headers") {
          // Non-header line after headers - transition to body and process this line as body
          currentSection = "body";
          bodyLines.push(line);
          continue;
        }
      }

      // Parse body
      if (currentSection === "body") {
        bodyLines.push(line);
      }
    }

    // Finalize last request
    if (currentRequest && this.isValidRequest(currentRequest)) {
      this.finalizeRequest(
        currentRequest,
        bodyLines,
        requests,
        context,
        errors,
      );
    }

    return requests;
  }

  /**
   * Checks if line is an HTTP request line
   */
  private static isHTTPRequestLine(line: string): boolean {
    const methods: HTTPMethod[] = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
      "TRACE",
      "CONNECT",
    ];
    const parts = line.split(/\s+/);
    return parts.length >= 2 && methods.includes(parts[0] as HTTPMethod);
  }

  /**
   * Checks if line is a header line
   */
  private static isHeaderLine(line: string): boolean {
    // Must contain a colon and not start with http (URL)
    if (!line.includes(":") || line.startsWith("http")) {
      return false;
    }

    // Check if this looks like a valid HTTP header format
    const colonIndex = line.indexOf(":");
    if (colonIndex === 0) return false; // Can't start with colon

    const headerName = line.substring(0, colonIndex).trim();

    // Header names should only contain letters, numbers, hyphens, and underscores
    // and should not contain JSON-like characters
    const validHeaderPattern = /^[a-zA-Z0-9\-_]+$/;

    // Reject if it looks like JSON or other structured data
    if (
      line.trim().startsWith("{") ||
      line.trim().startsWith("[") ||
      line.trim().includes('":') ||
      line.trim().includes('"}')
    ) {
      return false;
    }

    return validHeaderPattern.test(headerName);
  }

  /**
   * Parses request line (METHOD URL)
   */
  private static parseRequestLine(
    line: string,
    context: HTTPParseContext,
    errors: HTTPParseError[],
  ): { method: HTTPMethod; url: string } | null {
    const parts = line.split(/\s+/);

    if (parts.length < 2) {
      errors.push({
        message: `Invalid request line: ${line}`,
        line: context.currentLine,
        severity: "error",
      });
      return null;
    }

    const method = parts[0].toUpperCase() as HTTPMethod;
    const url = parts[1];

    // Validate method
    const validMethods: HTTPMethod[] = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
      "TRACE",
      "CONNECT",
    ];
    if (!validMethods.includes(method)) {
      errors.push({
        message: `Invalid HTTP method: ${method}`,
        line: context.currentLine,
        severity: "error",
      });
      return null;
    }

    return { method, url };
  }

  /**
   * Parses header line
   */
  private static parseHeaderLine(
    line: string,
    context: HTTPParseContext,
    errors: HTTPParseError[],
  ): HTTPHeader | null {
    const colonIndex = line.indexOf(":");

    if (colonIndex === -1) {
      errors.push({
        message: `Invalid header line: ${line}`,
        line: context.currentLine,
        severity: "error",
      });
      return null;
    }

    const name = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();

    if (!name) {
      errors.push({
        message: `Empty header name: ${line}`,
        line: context.currentLine,
        severity: "error",
      });
      return null;
    }

    return {
      name,
      value,
      enabled: true,
    };
  }

  /**
   * Parses variable definition from comment
   */
  private static parseVariableDefinition(
    line: string,
    context: HTTPParseContext,
    warnings: HTTPParseWarning[],
  ): void {
    // Look for @variable = value patterns
    const match =
      line.match(/@(\w+)\s*=\s*(.+)/) || line.match(/(\w+)\s*=\s*(.+)/);

    if (match) {
      const [, name, value] = match;
      context.variables[name] = value.trim();
    }
  }

  /**
   * Initializes a new request object
   */
  private static initializeNewRequest(
    separatorLine: string | null,
    context: HTTPParseContext,
  ): Partial<HTTPRequest> {
    const request: Partial<HTTPRequest> = {
      id: crypto.randomUUID(),
      variables: {},
    };

    // Extract name from separator line
    if (separatorLine) {
      const nameMatch = separatorLine.match(/###\s*(.+)/);
      if (nameMatch) {
        request.name = nameMatch[1].trim();
      }
    }

    return request;
  }

  /**
   * Checks if request has required fields
   */
  private static isValidRequest(
    request: Partial<HTTPRequest>,
  ): request is HTTPRequest {
    return !!(request.method && request.url);
  }

  /**
   * Finalizes request with body content
   */
  private static finalizeRequest(
    request: Partial<HTTPRequest>,
    bodyLines: string[],
    requests: HTTPRequest[],
    context: HTTPParseContext,
    errors: HTTPParseError[],
  ): void {
    if (!this.isValidRequest(request)) {
      errors.push({
        message: "Invalid request: missing method or URL",
        line: context.currentLine,
        severity: "error",
      });
      return;
    }

    // Process body
    if (bodyLines.length > 0) {
      const bodyContent = bodyLines.join("\n").trim();
      if (bodyContent) {
        request.body = {
          type: this.detectBodyType(bodyContent, request.headers),
          content: bodyContent,
          contentType: this.getContentTypeFromHeaders(request.headers),
        };
      }
    }

    // Generate name if not provided
    if (!request.name) {
      request.name = `${request.method} ${this.extractPathFromUrl(request.url)}`;
    }

    requests.push(request as HTTPRequest);
  }

  /**
   * Detects body content type
   */
  private static detectBodyType(
    content: string,
    headers?: HTTPHeader[],
  ): HTTPRequestBody["type"] {
    // Check content-type header first
    const contentType = this.getContentTypeFromHeaders(headers);

    if (contentType) {
      if (contentType.includes("json")) return "json";
      if (contentType.includes("xml")) return "xml";
      if (contentType.includes("html")) return "html";
      if (contentType.includes("javascript")) return "javascript";
      if (contentType.includes("form-data")) return "form-data";
      if (contentType.includes("x-www-form-urlencoded"))
        return "form-urlencoded";
      if (contentType.includes("graphql")) return "graphql";
    }

    // Try to detect from content
    const trimmed = content.trim();

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
    if (trimmed.startsWith("<")) return "xml";
    if (trimmed.includes("query") && trimmed.includes("{")) return "graphql";

    return "text";
  }

  /**
   * Gets content-type from headers
   */
  private static getContentTypeFromHeaders(
    headers?: HTTPHeader[],
  ): string | undefined {
    if (!headers) return undefined;

    const contentTypeHeader = headers.find(
      (h) => h.name.toLowerCase() === "content-type",
    );

    return contentTypeHeader?.value;
  }

  /**
   * Extracts path from URL
   */
  private static extractPathFromUrl(url: string): string {
    try {
      if (url.startsWith("http")) {
        return new URL(url).pathname;
      } else {
        // Relative URL
        const queryIndex = url.indexOf("?");
        return queryIndex > -1 ? url.substring(0, queryIndex) : url;
      }
    } catch {
      return url;
    }
  }

  /**
   * Extracts variables from text
   */
  private static extractVariables(text: string): string[] {
    const variables: string[] = [];
    const matches = text.match(/\{\{([^}]+)\}\}/g);

    if (matches) {
      matches.forEach((match) => {
        const variable = match.replace(/[{}]/g, "");
        if (!variables.includes(variable)) {
          variables.push(variable);
        }
      });
    }

    return variables;
  }

  /**
   * Converts HTTP request to Postman request
   */
  private static convertHTTPRequestToPostman(
    httpRequest: HTTPRequest,
    globalVariables?: Record<string, string>,
  ): RequestItem {
    const headers =
      httpRequest.headers?.map((h) => ({
        key: h.name,
        value: h.value,
        disabled: !h.enabled,
        description: h.description,
      })) || [];

    const request: RequestItem = {
      id: httpRequest.id || crypto.randomUUID(),
      name: httpRequest.name || `${httpRequest.method} Request`,
      request: {
        method: httpRequest.method,
        header: headers,
        url: {
          raw: httpRequest.url,
          protocol: undefined,
          host: undefined,
          path: undefined,
          query: [],
          variable: [],
        },
        description: httpRequest.description,
      },
    };

    // Add body if present
    if (httpRequest.body && httpRequest.body.content.trim()) {
      request.request.body = {
        mode: "raw",
        raw: httpRequest.body.content,
      };
    }

    return request;
  }
}
