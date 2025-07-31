import type { PostmanCollection } from "~/types/postman";
import { storageService } from "../storage/storageService";

export interface ExportOptions {
  includeSensitiveData?: boolean;
  prettyPrint?: boolean;
  includeMetadata?: boolean;
}

export class PostmanExporter {
  /**
   * Exports a collection as Postman JSON
   */
  static async export(
    collection: PostmanCollection,
    options: ExportOptions = {},
  ): Promise<string> {
    const {
      includeSensitiveData = false,
      prettyPrint = true,
      includeMetadata = true,
    } = options;

    // Deep clone to avoid mutations
    let exportData = JSON.parse(JSON.stringify(collection));

    // Remove sensitive data if requested
    if (!includeSensitiveData) {
      exportData = this.removeSensitiveData(exportData);
    }

    // Add export metadata
    if (includeMetadata) {
      exportData.info._postman_export_id = crypto.randomUUID();
      exportData.info._postman_export_date = new Date().toISOString();
    }

    // Convert to JSON
    return prettyPrint
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);
  }

  /**
   * Exports a collection to a file download
   */
  static async exportToFile(
    collection: PostmanCollection,
    options: ExportOptions = {},
  ): Promise<void> {
    const json = await this.export(collection, options);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collection.info.name.replace(/[^a-z0-9]/gi, "_")}.postman_collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    URL.revokeObjectURL(url);
  }

  /**
   * Removes sensitive data from the collection
   */
  private static removeSensitiveData(collection: any): any {
    // Remove auth data
    if (collection.auth) {
      collection.auth = this.sanitizeAuth(collection.auth);
    }

    // Remove sensitive variables
    if (collection.variable && Array.isArray(collection.variable)) {
      collection.variable = collection.variable.map((v: any) => {
        if (
          v.type === "secret" ||
          v.key?.toLowerCase().includes("secret") ||
          v.key?.toLowerCase().includes("password") ||
          v.key?.toLowerCase().includes("token") ||
          v.key?.toLowerCase().includes("key")
        ) {
          return { ...v, value: "[REDACTED]" };
        }
        return v;
      });
    }

    // Process items recursively
    if (collection.item && Array.isArray(collection.item)) {
      collection.item = this.sanitizeItems(collection.item);
    }

    return collection;
  }

  /**
   * Sanitizes auth configuration
   */
  private static sanitizeAuth(auth: any): any {
    if (!auth || !auth.type) return auth;

    const sanitized = { ...auth };

    switch (auth.type) {
      case "bearer":
        if (sanitized.bearer) {
          sanitized.bearer = sanitized.bearer.map((item: any) => {
            if (item.key === "token") {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;

      case "basic":
        if (sanitized.basic) {
          sanitized.basic = sanitized.basic.map((item: any) => {
            if (item.key === "password") {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;

      case "apikey":
        if (sanitized.apikey) {
          sanitized.apikey = sanitized.apikey.map((item: any) => {
            if (item.key === "value") {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;

      case "oauth2": {
        if (sanitized.oauth2) {
          sanitized.oauth2 = sanitized.oauth2.map((item: any) => {
            if (
              ["accessToken", "refreshToken", "clientSecret"].includes(item.key)
            ) {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;
      }

      case "oauth1": {
        if (sanitized.oauth1) {
          sanitized.oauth1 = sanitized.oauth1.map((item: any) => {
            if (["consumerSecret", "tokenSecret"].includes(item.key)) {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;
      }

      case "jwt": {
        if (sanitized.jwt) {
          sanitized.jwt = sanitized.jwt.map((item: any) => {
            if (item.key === "token") {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;
      }

      case "awsv4": {
        if (sanitized.awsv4) {
          sanitized.awsv4 = sanitized.awsv4.map((item: any) => {
            if (["secretKey", "sessionToken"].includes(item.key)) {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;
      }

      case "digest": {
        if (sanitized.digest) {
          sanitized.digest = sanitized.digest.map((item: any) => {
            if (item.key === "password") {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;
      }

      case "hawk": {
        if (sanitized.hawk) {
          sanitized.hawk = sanitized.hawk.map((item: any) => {
            if (item.key === "authKey") {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;
      }

      case "ntlm": {
        if (sanitized.ntlm) {
          sanitized.ntlm = sanitized.ntlm.map((item: any) => {
            if (item.key === "password") {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;
      }

      case "custom": {
        if (sanitized.custom) {
          sanitized.custom = sanitized.custom.map((item: any) => {
            if (item.key === "headerValue") {
              return { ...item, value: "[REDACTED]" };
            }
            return item;
          });
        }
        break;
      }
    }

    return sanitized;
  }

  /**
   * Sanitizes items recursively
   */
  private static sanitizeItems(items: any[]): any[] {
    return items.map((item) => {
      // If it's a folder, process its items
      if (item.item && Array.isArray(item.item)) {
        item.item = this.sanitizeItems(item.item);
      }

      // If it's a request, sanitize auth and headers
      if (item.request) {
        // Sanitize auth
        if (item.request.auth) {
          item.request.auth = this.sanitizeAuth(item.request.auth);
        }

        // Sanitize headers
        if (item.request.header && Array.isArray(item.request.header)) {
          item.request.header = item.request.header.map((header: any) => {
            const key = header.key?.toLowerCase() || "";
            if (
              key.includes("authorization") ||
              key.includes("api-key") ||
              key.includes("x-api-key") ||
              key.includes("token")
            ) {
              return { ...header, value: "[REDACTED]" };
            }
            return header;
          });
        }
      }

      return item;
    });
  }

  /**
   * Exports all collections from storage
   */
  static async exportAll(options: ExportOptions = {}): Promise<{
    collections: any[];
    exportDate: string;
    version: string;
  }> {
    const allData = await storageService.exportAllData(
      !options.includeSensitiveData,
    );

    return {
      collections: allData.collections.map((c: any) => c.collection),
      exportDate: allData.exportDate,
      version: allData.version.toString(),
    };
  }

  /**
   * Exports all data to a backup file
   */
  static async exportBackup(includeEncrypted: boolean = false): Promise<void> {
    const data = await storageService.exportAllData(includeEncrypted);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-client-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    URL.revokeObjectURL(url);
  }
}
