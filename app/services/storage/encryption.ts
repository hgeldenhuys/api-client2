export class EncryptionService {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();

  /**
   * Derives a cryptographic key from a password using PBKDF2
   */
  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts data using AES-GCM
   */
  static async encrypt(data: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = this.encoder.encode(data);

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Return base64 encoded string
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypts data using AES-GCM
   */
  static async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data
    );

    return this.decoder.decode(decryptedData);
  }

  /**
   * Generates a random salt
   */
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  /**
   * Encrypts specific fields in an object
   */
  static async encryptFields<T extends Record<string, any>>(
    obj: T,
    fields: string[],
    key: CryptoKey
  ): Promise<{ data: T; encryptedFields: string[] }> {
    const cloned = JSON.parse(JSON.stringify(obj)) as T;
    const encryptedFields: string[] = [];

    for (const field of fields) {
      if (field in cloned && cloned[field] !== null && cloned[field] !== undefined) {
        const value = typeof cloned[field] === 'string' 
          ? cloned[field] 
          : JSON.stringify(cloned[field]);
        
        (cloned as any)[field] = await this.encrypt(value, key);
        encryptedFields.push(field);
      }
    }

    return { data: cloned, encryptedFields };
  }

  /**
   * Decrypts specific fields in an object
   */
  static async decryptFields<T extends Record<string, any>>(
    obj: T,
    encryptedFields: string[],
    key: CryptoKey
  ): Promise<T> {
    const cloned = JSON.parse(JSON.stringify(obj)) as T;

    for (const field of encryptedFields) {
      if (field in cloned && cloned[field] !== null && cloned[field] !== undefined) {
        try {
          const decrypted = await this.decrypt(cloned[field], key);
          // Try to parse as JSON, fallback to string
          try {
            (cloned as any)[field] = JSON.parse(decrypted);
          } catch {
            (cloned as any)[field] = decrypted;
          }
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Leave field as is if decryption fails
        }
      }
    }

    return cloned;
  }

  /**
   * Checks if encryption is available in the current environment
   */
  static isEncryptionAvailable(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.getRandomValues === 'function';
  }

  /**
   * Encrypts global variables array, handling secret types securely
   */
  static async encryptGlobalVariables<T extends { key: string; value: string; type?: string; enabled: boolean }[]>(
    variables: T,
    key: CryptoKey
  ): Promise<{ data: T; encryptedFields: string[] }> {
    const cloned = JSON.parse(JSON.stringify(variables)) as T;
    const encryptedFields: string[] = [];

    for (let i = 0; i < cloned.length; i++) {
      const variable = cloned[i];
      if (variable.type === 'secret' && variable.value) {
        try {
          (cloned[i] as any).value = await this.encrypt(variable.value, key);
          encryptedFields.push(`${i}.value`);
        } catch (error) {
          console.error(`Failed to encrypt global variable ${variable.key}:`, error);
          // Keep original value if encryption fails
        }
      }
    }

    return { data: cloned, encryptedFields };
  }

  /**
   * Decrypts global variables array, handling secret types securely
   */
  static async decryptGlobalVariables<T extends { key: string; value: string; type?: string; enabled: boolean }[]>(
    variables: T,
    encryptedFields: string[],
    key: CryptoKey
  ): Promise<T> {
    const cloned = JSON.parse(JSON.stringify(variables)) as T;
    const encryptedFieldsSet = new Set(encryptedFields);

    for (let i = 0; i < cloned.length; i++) {
      const fieldPath = `${i}.value`;
      if (encryptedFieldsSet.has(fieldPath) && cloned[i].value) {
        try {
          (cloned[i] as any).value = await this.decrypt(cloned[i].value, key);
        } catch (error) {
          console.error(`Failed to decrypt global variable ${cloned[i].key}:`, error);
          // Leave field as is if decryption fails
        }
      }
    }

    return cloned;
  }

  /**
   * Securely clears sensitive data from memory
   */
  static clearFromMemory(obj: any): void {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'string') {
            // Overwrite string with random data
            obj[key] = crypto.getRandomValues(new Uint8Array(obj[key].length))
              .reduce((str, byte) => str + String.fromCharCode(byte), '');
          } else if (typeof obj[key] === 'object') {
            this.clearFromMemory(obj[key]);
          }
          delete obj[key];
        }
      }
    }
  }
}