import { openDB, IDBPDatabase } from "idb";
import type {
  ApiClientDB,
  CollectionWithMetadata,
  RequestExecution,
  StoredEnvironment,
  StoredGlobalVariables,
} from "./schema";
import { DB_NAME, DB_VERSION, SENSITIVE_FIELDS } from "./schema";
import { EncryptionService } from "./encryption";
import type { PostmanCollection } from "~/types/postman";
import type {
  Environment,
  EnvironmentVariable,
} from "~/stores/environmentStore";

export class StorageService {
  private db: IDBPDatabase<ApiClientDB> | null = null;
  private encryptionKey: CryptoKey | null = null;
  private salt: Uint8Array | null = null;
  private isInitialized = false;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.db = await openDB<ApiClientDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Collections store
          if (!db.objectStoreNames.contains("collections")) {
            const collectionsStore = db.createObjectStore("collections", {
              keyPath: "id",
            });
            collectionsStore.createIndex("by-name", "collection.info.name");
            collectionsStore.createIndex("by-updated", "updatedAt");
          }

          // Environments store
          if (!db.objectStoreNames.contains("environments")) {
            const environmentsStore = db.createObjectStore("environments", {
              keyPath: "id",
            });
            environmentsStore.createIndex("by-name", "name");
          }

          // History store
          if (!db.objectStoreNames.contains("history")) {
            const historyStore = db.createObjectStore("history", {
              keyPath: "id",
            });
            historyStore.createIndex("by-collection", "collectionId");
            historyStore.createIndex("by-request", "requestId");
            historyStore.createIndex("by-timestamp", "timestamp");
          }

          // Settings store
          if (!db.objectStoreNames.contains("settings")) {
            db.createObjectStore("settings", { keyPath: "key" });
          }
        },
      });

      // Load encryption key if available
      await this.loadEncryptionKey();

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  /**
   * Set up encryption with a password
   */
  async setupEncryption(password: string): Promise<void> {
    // Check if salt exists in settings
    let salt = await this.getSetting<Uint8Array>("encryption-salt");

    if (!salt) {
      // Generate new salt
      salt = EncryptionService.generateSalt();
      await this.setSetting("encryption-salt", salt);
    }

    this.salt = salt;
    this.encryptionKey = await EncryptionService.deriveKey(password, salt);

    // Store a verification hash to check password validity later
    const verificationData = await EncryptionService.encrypt(
      "valid",
      this.encryptionKey,
    );
    await this.setSetting("encryption-verification", verificationData);
  }

  /**
   * Verify encryption password
   */
  async verifyEncryptionPassword(password: string): Promise<boolean> {
    const salt = await this.getSetting<Uint8Array>("encryption-salt");
    const verificationData = await this.getSetting<string>(
      "encryption-verification",
    );

    if (!salt || !verificationData) {
      return false;
    }

    try {
      const key = await EncryptionService.deriveKey(password, salt);
      const decrypted = await EncryptionService.decrypt(verificationData, key);
      return decrypted === "valid";
    } catch {
      return false;
    }
  }

  /**
   * Load encryption key if available
   */
  private async loadEncryptionKey(): Promise<void> {
    const salt = await this.getSetting<Uint8Array>("encryption-salt");
    if (salt) {
      this.salt = salt;
      // Key will be set when user provides password
    }
  }

  /**
   * Save a collection
   */
  async saveCollection(collection: PostmanCollection): Promise<string> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const id = collection.info._postman_id || crypto.randomUUID();
    const now = new Date();

    let collectionData = collection;
    let encryptedFields: string[] = [];

    // Encrypt sensitive fields if encryption is enabled
    if (this.encryptionKey) {
      const result = await EncryptionService.encryptFields(
        collection,
        SENSITIVE_FIELDS.collection,
        this.encryptionKey,
      );
      collectionData = result.data;
      encryptedFields = result.encryptedFields;
    }

    const metadata: CollectionWithMetadata = {
      id,
      collection: {
        ...collectionData,
        info: { ...collectionData.info, _postman_id: id },
      },
      createdAt: now,
      updatedAt: now,
      isEncrypted: !!this.encryptionKey,
      encryptedFields,
    };

    await this.db.put("collections", metadata);
    return id;
  }

  /**
   * Get a collection by ID
   */
  async getCollection(id: string): Promise<PostmanCollection | null> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const metadata = await this.db.get("collections", id);
    if (!metadata) {
      return null;
    }

    let collection = metadata.collection;

    // Decrypt if needed
    if (
      metadata.isEncrypted &&
      this.encryptionKey &&
      metadata.encryptedFields
    ) {
      collection = await EncryptionService.decryptFields(
        collection,
        metadata.encryptedFields,
        this.encryptionKey,
      );
    }

    return collection;
  }

  /**
   * Get all collections
   */
  async getAllCollections(): Promise<PostmanCollection[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const allMetadata = await this.db.getAll("collections");
    const collections: PostmanCollection[] = [];

    for (const metadata of allMetadata) {
      let collection = metadata.collection;

      // Decrypt if needed
      if (
        metadata.isEncrypted &&
        this.encryptionKey &&
        metadata.encryptedFields
      ) {
        collection = await EncryptionService.decryptFields(
          collection,
          metadata.encryptedFields,
          this.encryptionKey,
        );
      }

      collections.push(collection);
    }

    return collections;
  }

  /**
   * Delete a collection
   */
  async deleteCollection(id: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    await this.db.delete("collections", id);

    // Also delete related history
    const tx = this.db.transaction("history", "readwrite");
    const index = tx.store.index("by-collection");
    const keys = await index.getAllKeys(id);

    for (const key of keys) {
      await tx.store.delete(key);
    }

    await tx.done;
  }

  /**
   * Save an environment
   */
  async saveEnvironment(environment: Environment): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    let envData = { ...environment };
    let encryptedVariables: string[] = [];

    // Encrypt variable values if encryption is enabled
    if (this.encryptionKey) {
      const encryptedValues: Record<string, string> = {};
      const encryptedSecrets: Record<string, string> = {};

      // Encrypt regular variables
      for (const [key, value] of Object.entries(environment.values)) {
        encryptedValues[key] = await EncryptionService.encrypt(
          value,
          this.encryptionKey,
        );
        encryptedVariables.push(`values.${key}`);
      }

      // Encrypt secrets (they should always be encrypted)
      for (const [key, value] of Object.entries(environment.secrets || {})) {
        encryptedSecrets[key] = await EncryptionService.encrypt(
          value,
          this.encryptionKey,
        );
        encryptedVariables.push(`secrets.${key}`);
      }

      envData.values = encryptedValues;
      envData.secrets = encryptedSecrets;
    }

    const storedEnv: StoredEnvironment = {
      ...envData,
      isEncrypted: !!this.encryptionKey,
      encryptedVariables,
    };

    await this.db.put("environments", storedEnv);
  }

  /**
   * Get an environment by ID
   */
  async getEnvironment(id: string): Promise<Environment | null> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const storedEnv = await this.db.get("environments", id);
    if (!storedEnv) {
      return null;
    }

    let environment: Environment = {
      id: storedEnv.id,
      name: storedEnv.name,
      values: storedEnv.values || {},
      secrets: storedEnv.secrets || {},
      secretKeys: storedEnv.secretKeys || [],
    };

    // Decrypt variable values if needed
    if (
      storedEnv.isEncrypted &&
      this.encryptionKey &&
      storedEnv.encryptedVariables
    ) {
      const decryptedValues: Record<string, string> = {};
      const decryptedSecrets: Record<string, string> = {};

      for (const encryptedKey of storedEnv.encryptedVariables) {
        // Handle both regular values and secrets based on the key format
        if (encryptedKey.startsWith("secrets.")) {
          const secretKey = encryptedKey.replace("secrets.", "");
          if (secretKey in environment.secrets) {
            try {
              decryptedSecrets[secretKey] = await EncryptionService.decrypt(
                environment.secrets[secretKey],
                this.encryptionKey,
              );
            } catch {
              decryptedSecrets[secretKey] = environment.secrets[secretKey]; // Fallback
            }
          }
        } else if (encryptedKey.startsWith("values.")) {
          const valueKey = encryptedKey.replace("values.", "");
          if (valueKey in environment.values) {
            try {
              decryptedValues[valueKey] = await EncryptionService.decrypt(
                environment.values[valueKey],
                this.encryptionKey,
              );
            } catch {
              decryptedValues[valueKey] = environment.values[valueKey]; // Fallback
            }
          }
        } else {
          // Legacy format - assume it's in values
          if (encryptedKey in environment.values) {
            try {
              decryptedValues[encryptedKey] = await EncryptionService.decrypt(
                environment.values[encryptedKey],
                this.encryptionKey,
              );
            } catch {
              decryptedValues[encryptedKey] = environment.values[encryptedKey]; // Fallback
            }
          }
        }
      }

      // Apply decrypted values
      environment.values = { ...environment.values, ...decryptedValues };
      environment.secrets = { ...environment.secrets, ...decryptedSecrets };
    }

    return environment;
  }

  /**
   * Get all environments
   */
  async getAllEnvironments(): Promise<Environment[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const allStored = await this.db.getAll("environments");
    const environments: Environment[] = [];

    for (const storedEnv of allStored) {
      let environment: Environment = {
        id: storedEnv.id,
        name: storedEnv.name,
        values: storedEnv.values || {},
        secrets: storedEnv.secrets || {},
        secretKeys: storedEnv.secretKeys || [],
      };

      // Decrypt variable values if needed
      if (
        storedEnv.isEncrypted &&
        this.encryptionKey &&
        storedEnv.encryptedVariables
      ) {
        const decryptedValues: Record<string, string> = {};
        const decryptedSecrets: Record<string, string> = {};

        for (const encryptedKey of storedEnv.encryptedVariables) {
          // Handle both regular values and secrets based on the key format
          if (encryptedKey.startsWith("secrets.")) {
            const secretKey = encryptedKey.replace("secrets.", "");
            if (secretKey in environment.secrets) {
              try {
                decryptedSecrets[secretKey] = await EncryptionService.decrypt(
                  environment.secrets[secretKey],
                  this.encryptionKey,
                );
              } catch {
                decryptedSecrets[secretKey] = environment.secrets[secretKey]; // Fallback
              }
            }
          } else if (encryptedKey.startsWith("values.")) {
            const valueKey = encryptedKey.replace("values.", "");
            if (valueKey in environment.values) {
              try {
                decryptedValues[valueKey] = await EncryptionService.decrypt(
                  environment.values[valueKey],
                  this.encryptionKey,
                );
              } catch {
                decryptedValues[valueKey] = environment.values[valueKey]; // Fallback
              }
            }
          } else {
            // Legacy format - assume it's in values
            if (encryptedKey in environment.values) {
              try {
                decryptedValues[encryptedKey] = await EncryptionService.decrypt(
                  environment.values[encryptedKey],
                  this.encryptionKey,
                );
              } catch {
                decryptedValues[encryptedKey] =
                  environment.values[encryptedKey]; // Fallback
              }
            }
          }
        }

        // Apply decrypted values
        environment.values = { ...environment.values, ...decryptedValues };
        environment.secrets = { ...environment.secrets, ...decryptedSecrets };
      }

      environments.push(environment);
    }

    return environments;
  }

  /**
   * Delete an environment
   */
  async deleteEnvironment(id: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    await this.db.delete("environments", id);
  }

  /**
   * Save global variables with encryption for secrets
   */
  async saveGlobalVariables(variables: EnvironmentVariable[]): Promise<void> {
    let storedData: StoredGlobalVariables;

    if (this.encryptionKey) {
      // Encrypt secret variables
      const result = await EncryptionService.encryptGlobalVariables(
        variables,
        this.encryptionKey,
      );
      storedData = {
        variables: result.data,
        isEncrypted: true,
        encryptedFields: result.encryptedFields,
      };
    } else {
      // Store without encryption
      storedData = {
        variables,
        isEncrypted: false,
      };
    }

    await this.setSetting("global-variables", storedData);
  }

  /**
   * Get global variables with decryption for secrets
   */
  async getGlobalVariables(): Promise<EnvironmentVariable[]> {
    const storedData =
      await this.getSetting<StoredGlobalVariables>("global-variables");

    if (!storedData) {
      return [];
    }

    // Handle legacy format (plain array)
    if (Array.isArray(storedData)) {
      return storedData as EnvironmentVariable[];
    }

    if (
      storedData.isEncrypted &&
      this.encryptionKey &&
      storedData.encryptedFields
    ) {
      try {
        // Decrypt secret variables
        const decrypted = await EncryptionService.decryptGlobalVariables(
          storedData.variables,
          storedData.encryptedFields,
          this.encryptionKey,
        );
        return decrypted;
      } catch (error) {
        console.error("Failed to decrypt global variables:", error);
        // Return encrypted data as fallback (user can re-enter password)
        return storedData.variables;
      }
    }

    return storedData.variables;
  }

  /**
   * Save request execution history
   */
  async saveRequestExecution(
    execution: Omit<RequestExecution, "id">,
  ): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const id = crypto.randomUUID();
    const record: RequestExecution = {
      id,
      ...execution,
    };

    await this.db.add("history", record);
  }

  /**
   * Get request history
   */
  async getRequestHistory(
    requestId: string,
    limit: number = 10,
  ): Promise<RequestExecution[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const tx = this.db.transaction("history", "readonly");
    const index = tx.store.index("by-request");
    const history = await index.getAll(requestId);

    // Sort by timestamp descending and limit
    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const tx = this.db.transaction("history", "readwrite");
    await tx.store.clear();
    await tx.done;
  }

  /**
   * Get a setting
   */
  private async getSetting<T>(key: string): Promise<T | null> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const setting = await this.db.get("settings", key);
    return setting?.value ?? null;
  }

  /**
   * Set a setting
   */
  private async setSetting(key: string, value: any): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    await this.db.put("settings", { key, value });
  }

  /**
   * Check if storage is initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if encryption is enabled
   */
  isEncryptionEnabled(): boolean {
    return !!this.encryptionKey;
  }

  /**
   * Export all data (for backup)
   */
  async exportAllData(includeEncrypted: boolean = false): Promise<any> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const collections = await this.db.getAll("collections");
    const environments = await this.db.getAll("environments");
    const history = await this.db.getAll("history");

    // If not including encrypted data, decrypt first
    if (!includeEncrypted && this.encryptionKey) {
      // Decrypt collections
      for (const col of collections) {
        if (col.isEncrypted && col.encryptedFields) {
          col.collection = await EncryptionService.decryptFields(
            col.collection,
            col.encryptedFields,
            this.encryptionKey,
          );
          col.isEncrypted = false;
          col.encryptedFields = [];
        }
      }

      // Decrypt environments
      for (const env of environments) {
        if (env.isEncrypted && env.encryptedVariables) {
          const decryptedValues: Record<string, string> = {};

          for (const key of env.encryptedVariables) {
            if (key in env.values) {
              try {
                decryptedValues[key] = await EncryptionService.decrypt(
                  env.values[key],
                  this.encryptionKey,
                );
              } catch {
                decryptedValues[key] = env.values[key];
              }
            }
          }

          env.values = { ...env.values, ...decryptedValues };
          env.isEncrypted = false;
          env.encryptedVariables = [];
        }
      }
    }

    return {
      version: DB_VERSION,
      exportDate: new Date().toISOString(),
      collections,
      environments,
      history,
    };
  }

  /**
   * Save proxy configuration
   */
  async saveProxyConfig(config: any): Promise<void> {
    await this.setSetting("proxy-config", config);
  }

  /**
   * Get proxy configuration
   */
  async getProxyConfig(): Promise<any | null> {
    return await this.getSetting("proxy-config");
  }
}

// Singleton instance
export const storageService = new StorageService();
