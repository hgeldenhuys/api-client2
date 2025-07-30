/**
 * Security tests for XSS protection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EncryptionService } from '../../app/services/storage/encryption';
import { MemoryProtection } from '../../app/services/security/memoryProtection';
import { RuntimeGuards } from '../../app/services/security/runtimeGuards';

// Mock crypto for testing
const mockCrypto = {
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  subtle: {
    importKey: vi.fn(),
    deriveKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  }
};

// @ts-ignore
global.crypto = mockCrypto;

describe('XSS Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    MemoryProtection.cleanup();
  });

  describe('EncryptionService', () => {
    it('should encrypt global variables marked as secrets', async () => {
      const mockKey = {} as CryptoKey;
      const variables = [
        { key: 'public', value: 'public-value', type: 'default', enabled: true },
        { key: 'secret', value: 'secret-value', type: 'secret', enabled: true },
      ];

      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));

      const result = await EncryptionService.encryptGlobalVariables(variables, mockKey);

      expect(result.encryptedFields).toContain('1.value');
      expect(result.encryptedFields).not.toContain('0.value');
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        expect.any(Object),
        mockKey,
        expect.any(Uint8Array)
      );
    });

    it('should decrypt global variables correctly', async () => {
      const mockKey = {} as CryptoKey;
      const encryptedVariables = [
        { key: 'public', value: 'public-value', type: 'default', enabled: true },
        { key: 'secret', value: 'encrypted-data', type: 'secret', enabled: true },
      ];
      const encryptedFields = ['1.value'];

      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode('decrypted-secret')
      );

      const result = await EncryptionService.decryptGlobalVariables(
        encryptedVariables,
        encryptedFields,
        mockKey
      );

      expect(result[1].value).toBe('decrypted-secret');
      expect(result[0].value).toBe('public-value');
    });

    it('should securely clear sensitive data from memory', () => {
      const sensitiveData = {
        secret: 'sensitive-value',
        nested: {
          token: 'auth-token'
        }
      };

      EncryptionService.clearFromMemory(sensitiveData);

      // Data should be overwritten and deleted
      expect(Object.keys(sensitiveData)).toHaveLength(0);
    });
  });

  describe('MemoryProtection', () => {
    it('should mark objects as sensitive', () => {
      const obj = { secret: 'value' };

      MemoryProtection.markSensitive(obj);

      expect(MemoryProtection.isSensitive(obj)).toBe(true);
    });

    it('should schedule automatic clearing of sensitive data', (done) => {
      const obj = { secret: 'value' };
      MemoryProtection.markSensitive(obj);

      MemoryProtection.scheduleClearing(obj, 50); // 50ms delay

      setTimeout(() => {
        expect(MemoryProtection.isSensitive(obj)).toBe(false);
        done();
      }, 100);
    });

    it('should create secure wrappers that auto-clear results', () => {
      const sensitiveOperation = () => ({ secret: 'value' });
      const secureWrapper = MemoryProtection.createSecureWrapper(sensitiveOperation);

      const result = secureWrapper();

      expect(MemoryProtection.isSensitive(result)).toBe(true);
    });

    it('should create secure proxies that protect sensitive properties', () => {
      const target = { public: 'safe', secret: 'sensitive' };
      const proxy = MemoryProtection.createSecureProxy(target, ['secret']);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Accessing sensitive property should log warning
      const value = proxy.secret;

      expect(consoleSpy).toHaveBeenCalledWith('Access to sensitive property: secret');
      consoleSpy.mockRestore();
    });
  });

  describe('RuntimeGuards', () => {
    it('should detect malicious code patterns', () => {
      const maliciousCode = 'eval("malicious code")';
      const safeCode = 'const x = 1 + 1';

      // Use reflection to test private method
      const detectMalicious = (RuntimeGuards as any).detectMaliciousCode;

      expect(detectMalicious(maliciousCode)).toBe(true);
      expect(detectMalicious(safeCode)).toBe(false);
    });

    it('should identify sensitive keys', () => {
      const sensitiveKeys = ['secret', 'token', 'apiKey', 'password'];
      const safeKeys = ['name', 'title', 'description'];

      const isSensitiveKey = (RuntimeGuards as any).isSensitiveKey;

      sensitiveKeys.forEach(key => {
        expect(isSensitiveKey(key)).toBe(true);
      });

      safeKeys.forEach(key => {
        expect(isSensitiveKey(key)).toBe(false);
      });
    });

    it('should protect store methods', () => {
      const mockStore = {
        getState: vi.fn(() => ({ secret: 'value' })),
        setState: vi.fn(),
        subscribe: vi.fn()
      };

      RuntimeGuards.protectStore('testStore', mockStore);

      // Original methods should be wrapped
      expect(mockStore.getState).not.toBe(mockStore.getState);
      expect(RuntimeGuards.isProtectionActive()).toBe(true);
    });

    it('should create secure copies without sensitive data', () => {
      const sensitiveState = {
        publicData: 'safe',
        secret: 'sensitive',
        token: 'auth-token'
      };

      const createSecureCopy = (RuntimeGuards as any).createSecureCopy;
      const copy = createSecureCopy(sensitiveState);

      expect(copy.publicData).toBe('safe');
      expect(copy.secret).toBe('[PROTECTED]');
      expect(copy.token).toBe('[PROTECTED]');
    });
  });

  describe('Integration Tests', () => {
    it('should protect against XSS store access attempts', () => {
      const mockStore = {
        getState: () => ({ globalVariables: [{ key: 'secret', value: 'sensitive', type: 'secret' }] }),
        setState: vi.fn(),
        subscribe: vi.fn()
      };

      RuntimeGuards.protectStore('environmentStore', mockStore);

      // Simulate XSS trying to access store
      const state = mockStore.getState();

      // State should be a secure copy, not the original
      expect(state).not.toBe(mockStore.getState());
    });

    it('should prevent malicious state updates', () => {
      const mockStore = {
        getState: vi.fn(),
        setState: vi.fn(),
        subscribe: vi.fn()
      };

      RuntimeGuards.protectStore('testStore', mockStore);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Try to inject malicious code via setState
      const maliciousUpdater = () => {
        eval('window.hacked = true');
      };

      mockStore.setState(maliciousUpdater);

      // Should detect and block malicious code
      expect(consoleSpy).toHaveBeenCalledWith(
        'Potentially malicious state update detected and blocked'
      );
      expect(mockStore.setState).not.toHaveBeenCalledWith(maliciousUpdater);

      consoleSpy.mockRestore();
    });

    it('should handle encrypted storage correctly', async () => {
      const mockKey = {} as CryptoKey;
      const variables = [
        { key: 'normal', value: 'normal-value', type: 'default', enabled: true },
        { key: 'secret', value: 'secret-value', type: 'secret', enabled: true }
      ];

      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode('secret-value')
      );

      // Encrypt
      const encrypted = await EncryptionService.encryptGlobalVariables(variables, mockKey);
      expect(encrypted.encryptedFields).toContain('1.value');

      // Decrypt
      const decrypted = await EncryptionService.decryptGlobalVariables(
        encrypted.data,
        encrypted.encryptedFields,
        mockKey
      );

      expect(decrypted[1].value).toBe('secret-value');
    });

    it('should generate security report', () => {
      RuntimeGuards.protectStore('store1', {});
      RuntimeGuards.protectStore('store2', {});

      const report = RuntimeGuards.generateSecurityReport();

      expect(report.protectedStores).toContain('store1');
      expect(report.protectedStores).toContain('store2');
      expect(report.detectedThreats).toBe(0);
      expect(report.lastAccess).toBeDefined();
    });
  });

  describe('Real-world Attack Scenarios', () => {
    it('should protect against console-based secret extraction', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Install monitoring (would normally be done on app start)
      MemoryProtection.installAccessMonitor();

      // Simulate XSS trying to log secrets
      console.log('secret: my-api-key');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Potential sensitive data exposure attempt detected'
      );

      consoleSpy.mockRestore();
    });

    it('should protect against DOM-based attacks', () => {
      // Mock DOM
      const mockDocument = {
        querySelector: vi.fn()
      };
      
      global.document = mockDocument as any;

      RuntimeGuards.installGlobalProtection();

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate XSS trying to query sensitive DOM elements
      document.querySelector('[data-secret]');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious DOM query detected')
      );

      consoleSpy.mockRestore();
    });

    it('should protect against eval-based attacks', () => {
      // Mock window
      global.window = { eval: eval } as any;

      RuntimeGuards.installGlobalProtection();

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        window.eval('malicious code with token');
      } catch (error) {
        // Should throw error for malicious eval
        expect(error.message).toContain('Malicious eval() attempt blocked');
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'eval() usage detected - potential security risk'
      );

      consoleSpy.mockRestore();
    });
  });
});