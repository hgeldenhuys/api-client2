/**
 * Memory protection utilities to prevent XSS access to sensitive data
 */

import { EncryptionService } from '../storage/encryption';

export class MemoryProtection {
  private static sensitiveRefs = new WeakSet();
  private static clearTimers = new Map<object, NodeJS.Timeout>();

  /**
   * Mark an object as containing sensitive data
   */
  static markSensitive(obj: object): void {
    this.sensitiveRefs.add(obj);
  }

  /**
   * Check if an object contains sensitive data
   */
  static isSensitive(obj: object): boolean {
    return this.sensitiveRefs.has(obj);
  }

  /**
   * Schedule automatic clearing of sensitive data
   */
  static scheduleClearing(obj: object, delayMs: number = 30000): void {
    // Clear any existing timer
    if (this.clearTimers.has(obj)) {
      clearTimeout(this.clearTimers.get(obj)!);
    }

    // Schedule new clear operation
    const timer = setTimeout(() => {
      this.clearSensitiveData(obj);
      this.clearTimers.delete(obj);
    }, delayMs);

    this.clearTimers.set(obj, timer);
  }

  /**
   * Immediately clear sensitive data from memory
   */
  static clearSensitiveData(obj: any): void {
    if (this.isSensitive(obj)) {
      EncryptionService.clearFromMemory(obj);
      this.sensitiveRefs.delete(obj);
    }
  }

  /**
   * Create a secure wrapper for sensitive operations
   */
  static createSecureWrapper<T extends (...args: any[]) => any>(
    operation: T,
    clearResult: boolean = true
  ): T {
    return ((...args: any[]) => {
      try {
        const result = operation(...args);
        
        if (clearResult && typeof result === 'object' && result !== null) {
          this.markSensitive(result);
          this.scheduleClearing(result, 10000); // Clear after 10 seconds
        }
        
        return result;
      } catch (error) {
        // Clear arguments from memory on error
        args.forEach(arg => {
          if (typeof arg === 'object' && arg !== null) {
            this.clearSensitiveData(arg);
          }
        });
        throw error;
      }
    }) as T;
  }

  /**
   * Proxy object to protect sensitive properties
   */
  static createSecureProxy<T extends object>(
    target: T,
    sensitiveKeys: (keyof T)[]
  ): T {
    const sensitiveKeySet = new Set(sensitiveKeys);
    
    return new Proxy(target, {
      get(obj, prop) {
        const value = (obj as any)[prop];
        
        if (sensitiveKeySet.has(prop as keyof T)) {
          // Log access to sensitive properties for monitoring
          console.warn(`Access to sensitive property: ${String(prop)}`);
          
          // Return a copy to prevent reference retention
          if (typeof value === 'object' && value !== null) {
            return JSON.parse(JSON.stringify(value));
          }
        }
        
        return value;
      },
      
      set(obj, prop, value) {
        if (sensitiveKeySet.has(prop as keyof T)) {
          // Mark sensitive data
          if (typeof value === 'object' && value !== null) {
            this.markSensitive(value);
          }
        }
        
        (obj as any)[prop] = value;
        return true;
      },
      
      deleteProperty(obj, prop) {
        if (sensitiveKeySet.has(prop as keyof T)) {
          const value = (obj as any)[prop];
          if (typeof value === 'object' && value !== null) {
            this.clearSensitiveData(value);
          }
        }
        
        delete (obj as any)[prop];
        return true;
      }
    });
  }

  /**
   * Monitor for potential XSS attempts accessing sensitive data
   */
  static installAccessMonitor(): void {
    if (typeof window === 'undefined') return;

    // Monitor console access attempts
    const originalConsole = { ...console };
    
    ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
      (console as any)[method] = (...args: any[]) => {
        // Check if any argument contains sensitive patterns
        const hasSecrets = args.some(arg => 
          typeof arg === 'string' && 
          (arg.includes('secret') || arg.includes('token') || arg.includes('key'))
        );
        
        if (hasSecrets) {
          console.warn('Potential sensitive data exposure attempt detected');
        }
        
        return (originalConsole as any)[method](...args);
      };
    });

    // Monitor global variable access
    if (typeof Proxy !== 'undefined') {
      const originalGlobal = window as any;
      
      // Protect against common XSS patterns
      Object.defineProperty(window, 'useEnvironmentStore', {
        get: () => {
          console.warn('Direct access to environment store detected');
          return originalGlobal.useEnvironmentStore;
        },
        configurable: false
      });
    }
  }

  /**
   * Clean up all memory protection resources
   */
  static cleanup(): void {
    // Clear all pending timers
    this.clearTimers.forEach(timer => clearTimeout(timer));
    this.clearTimers.clear();
    
    // Note: WeakSet automatically cleans up when objects are garbage collected
  }
}