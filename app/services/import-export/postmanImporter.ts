import type { PostmanCollection } from "~/types/postman";

export class PostmanImporter {
  /**
   * Validates if the input is a valid Postman Collection v2.1
   */
  static validate(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== "object") {
      errors.push("Invalid JSON structure");
      return { valid: false, errors };
    }

    // Check required fields
    if (!data.info) {
      errors.push("Missing required field: info");
    } else {
      if (!data.info.name) {
        errors.push("Missing required field: info.name");
      }
      if (!data.info.schema) {
        errors.push("Missing required field: info.schema");
      }
    }

    if (!data.item || !Array.isArray(data.item)) {
      errors.push("Missing or invalid field: item (must be an array)");
    }

    // Check schema version
    if (data.info?.schema && !data.info.schema.includes("v2.1")) {
      errors.push(
        `Unsupported schema version: ${data.info.schema}. Only v2.1.0 is supported.`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitizes the collection data to ensure it's safe to use
   */
  static sanitize(collection: any): PostmanCollection {
    // Deep clone to avoid mutations
    const sanitized = JSON.parse(JSON.stringify(collection));

    // Ensure required fields exist
    if (!sanitized.info._postman_id) {
      sanitized.info._postman_id = crypto.randomUUID();
    }

    // Sanitize items recursively
    if (sanitized.item && Array.isArray(sanitized.item)) {
      sanitized.item = this.sanitizeItems(sanitized.item);
    }

    // Ensure variables array exists
    if (!sanitized.variable) {
      sanitized.variable = [];
    }

    // Sanitize collection-level auth if present
    if (sanitized.auth) {
      sanitized.auth = this.sanitizeAuth(sanitized.auth);
    }

    return sanitized as PostmanCollection;
  }

  /**
   * Sanitizes items (requests and folders) recursively
   */
  private static sanitizeItems(items: any[]): any[] {
    return items.map((item) => {
      // Ensure item has an ID
      if (!item.id) {
        item.id = crypto.randomUUID();
      }

      // If it's a folder, sanitize its items recursively
      if (item.item && Array.isArray(item.item)) {
        item.item = this.sanitizeItems(item.item);
      }

      // If it's a request, ensure required fields
      if (item.request) {
        // Ensure method exists
        if (!item.request.method) {
          item.request.method = "GET";
        }

        // Ensure headers is an array
        if (item.request.header && !Array.isArray(item.request.header)) {
          item.request.header = [];
        }

        // Ensure URL is properly formatted
        if (typeof item.request.url === "string") {
          item.request.url = {
            raw: item.request.url,
            protocol: null,
            host: null,
            path: null,
            query: [],
            variable: [],
          };
        }

        // Validate auth if present
        if (item.request.auth) {
          item.request.auth = this.sanitizeAuth(item.request.auth);
        }
      }

      // If it's a folder with auth
      if (item.auth) {
        item.auth = this.sanitizeAuth(item.auth);
      }

      return item;
    });
  }

  /**
   * Sanitizes auth configuration to ensure it's valid
   */
  private static sanitizeAuth(auth: any): any {
    if (!auth || !auth.type) {
      return auth;
    }

    // Ensure the auth type is valid
    const validAuthTypes = [
      "apikey",
      "awsv4",
      "basic",
      "bearer",
      "digest",
      "edgegrid",
      "hawk",
      "noauth",
      "oauth1",
      "oauth2",
      "ntlm",
      "jwt",
      "custom",
    ];

    if (!validAuthTypes.includes(auth.type)) {
      return { type: "noauth" };
    }

    // Ensure auth params are arrays
    const authTypeKey = auth.type;
    if (authTypeKey !== "noauth" && auth[authTypeKey]) {
      if (!Array.isArray(auth[authTypeKey])) {
        auth[authTypeKey] = [];
      }

      // Ensure each param has required fields
      auth[authTypeKey] = auth[authTypeKey].map((param: any) => ({
        key: param.key || "",
        value: param.value || "",
        type: param.type || "string",
      }));
    }

    return auth;
  }

  /**
   * Imports a Postman collection from JSON
   */
  static async import(jsonData: string | object): Promise<{
    success: boolean;
    collection?: PostmanCollection;
    error?: string;
  }> {
    try {
      // Parse JSON if string
      const data =
        typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;

      // Validate
      const validation = this.validate(data);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
        };
      }

      // Sanitize
      const sanitized = this.sanitize(data);

      return {
        success: true,
        collection: sanitized,
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
  }> {
    try {
      const text = await file.text();
      return this.import(text);
    } catch (error) {
      return {
        success: false,
        error: "Failed to read file",
      };
    }
  }
}
