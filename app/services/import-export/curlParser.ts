import type { RequestItem, RequestAuth } from "~/types/postman";

export class CurlParser {
  /**
   * Parses a cURL command into a Postman request
   */
  static parse(curlCommand: string): {
    success: boolean;
    request?: RequestItem;
    error?: string;
  } {
    try {
      // Clean up the command
      const cleaned = curlCommand
        .trim()
        .replace(/\\\n/g, " ")
        .replace(/\s+/g, " ");

      if (!cleaned.startsWith("curl")) {
        return {
          success: false,
          error: "Not a valid cURL command",
        };
      }

      // Parse the command
      const args = this.parseArguments(cleaned);
      const request = this.buildRequest(args);

      return {
        success: true,
        request,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse cURL command",
      };
    }
  }

  /**
   * Parses command line arguments
   */
  private static parseArguments(command: string): Map<string, string[]> {
    const args = new Map<string, string[]>();
    const tokens = this.tokenize(command);

    let i = 1; // Skip 'curl'
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.startsWith("-")) {
        const flag = token;
        const values: string[] = [];

        // Collect values for this flag
        i++;
        while (i < tokens.length && !tokens[i].startsWith("-")) {
          values.push(tokens[i]);
          i++;
        }

        // Store the values
        if (!args.has(flag)) {
          args.set(flag, []);
        }
        args.get(flag)!.push(...values);
      } else {
        // URL without flag
        if (!args.has("url")) {
          args.set("url", []);
        }
        args.get("url")!.push(token);
        i++;
      }
    }

    return args;
  }

  /**
   * Tokenizes a command line string
   */
  private static tokenize(command: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < command.length; i++) {
      const char = command[i];
      const nextChar = command[i + 1];

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar && command[i - 1] !== "\\") {
        inQuotes = false;
        quoteChar = "";
      } else if (!inQuotes && char === " ") {
        if (current) {
          tokens.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Builds a Postman request from parsed arguments
   */
  private static buildRequest(args: Map<string, string[]>): RequestItem {
    const request: RequestItem = {
      id: crypto.randomUUID(),
      name: "Imported from cURL",
      request: {
        method: "GET",
        header: [],
        url: {
          raw: "",
          protocol: undefined,
          host: undefined,
          path: undefined,
          query: [],
          variable: [],
        },
      },
    };

    // Set URL
    const urls = args.get("url") || [];
    if (urls.length > 0) {
      if (typeof request.request.url === "object") {
        request.request.url.raw = urls[0];
        this.parseUrl(urls[0], request.request.url);
      }
    }

    // Set method
    if (args.has("-X") || args.has("--request")) {
      const method = (args.get("-X") || args.get("--request") || [])[0];
      if (method) {
        request.request.method = method.toUpperCase() as any;
      }
    }

    // Set headers
    const headers = [
      ...(args.get("-H") || []),
      ...(args.get("--header") || []),
    ];
    for (const header of headers) {
      const colonIndex = header.indexOf(":");
      if (colonIndex > 0) {
        const key = header.substring(0, colonIndex).trim();
        const value = header.substring(colonIndex + 1).trim();
        request.request.header?.push({ key, value });
      }
    }

    // Set body
    const dataArgs = [...(args.get("-d") || []), ...(args.get("--data") || [])];
    const rawDataArgs = [...(args.get("--data-raw") || [])];
    const jsonDataArgs = [...(args.get("--json") || [])];

    if (
      dataArgs.length > 0 ||
      rawDataArgs.length > 0 ||
      jsonDataArgs.length > 0
    ) {
      const bodyData = [...dataArgs, ...rawDataArgs, ...jsonDataArgs].join("");

      request.request.body = {
        mode: "raw",
        raw: bodyData,
      };

      // Auto-detect content type
      if (jsonDataArgs.length > 0 || this.isJson(bodyData)) {
        request.request.header?.push({
          key: "Content-Type",
          value: "application/json",
        });
      }
    }

    // Set authentication
    const auth = this.parseAuth(args);
    if (auth) {
      request.request.auth = auth;
    }

    // Handle other common flags
    if (args.has("-L") || args.has("--location")) {
      // Follow redirects - note this in name suffix
      request.name += " (follows redirects)";
    }

    return request;
  }

  /**
   * Parses URL into components
   */
  private static parseUrl(rawUrl: string, urlObj: any): void {
    try {
      const url = new URL(rawUrl);

      urlObj.protocol = url.protocol.replace(":", "");
      urlObj.host = url.hostname.split(".");
      urlObj.path = url.pathname.split("/").filter(Boolean);

      if (url.port) {
        urlObj.port = url.port;
      }

      // Parse query parameters
      url.searchParams.forEach((value, key) => {
        urlObj.query.push({ key, value });
      });
    } catch {
      // If URL parsing fails, keep the raw URL
    }
  }

  /**
   * Parses authentication from arguments
   */
  private static parseAuth(
    args: Map<string, string[]>,
  ): RequestAuth | undefined {
    // Basic auth
    if (args.has("-u") || args.has("--user")) {
      const userPass = (args.get("-u") || args.get("--user") || [])[0];
      if (userPass) {
        const [username, password] = userPass.split(":");
        return {
          type: "basic",
          basic: [
            { key: "username", value: username || "", type: "string" },
            { key: "password", value: password || "", type: "string" },
          ],
        };
      }
    }

    // Bearer token from Authorization header
    const headers = [
      ...(args.get("-H") || []),
      ...(args.get("--header") || []),
    ];
    for (const header of headers) {
      if (header.toLowerCase().startsWith("authorization:")) {
        const value = header.substring(header.indexOf(":") + 1).trim();
        if (value.toLowerCase().startsWith("bearer ")) {
          return {
            type: "bearer",
            bearer: [
              { key: "token", value: value.substring(7), type: "string" },
            ],
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Checks if a string is JSON
   */
  private static isJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Exports a request as cURL command
   */
  static export(request: RequestItem): string {
    const parts: string[] = ["curl"];

    // Add method if not GET
    if (request.request.method && request.request.method !== "GET") {
      parts.push("-X", request.request.method);
    }

    // Add headers
    if (request.request.header && Array.isArray(request.request.header)) {
      for (const header of request.request.header) {
        if (header.key && header.value) {
          parts.push("-H", `'${header.key}: ${header.value}'`);
        }
      }
    }

    // Add body
    if (request.request.body) {
      if (request.request.body.mode === "raw" && request.request.body.raw) {
        parts.push("--data-raw", `'${request.request.body.raw}'`);
      }
    }

    // Add auth
    if (request.request.auth) {
      switch (request.request.auth.type) {
        case "basic":
          const username =
            request.request.auth.basic?.find((i) => i.key === "username")
              ?.value || "";
          const password =
            request.request.auth.basic?.find((i) => i.key === "password")
              ?.value || "";
          parts.push("-u", `'${username}:${password}'`);
          break;

        case "bearer":
          const token =
            request.request.auth.bearer?.find((i) => i.key === "token")
              ?.value || "";
          parts.push("-H", `'Authorization: Bearer ${token}'`);
          break;
      }
    }

    // Add URL (always last)
    if (request.request.url) {
      const url =
        typeof request.request.url === "string"
          ? request.request.url
          : request.request.url.raw || "";
      parts.push(`'${url}'`);
    }

    return parts.join(" ");
  }
}
