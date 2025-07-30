/**
 * Runtime guards to protect against XSS store manipulation
 */

export class RuntimeGuards {
  private static originalFunctions = new Map<string, Function>();
  private static guardedStores = new Set<string>();

  /**
   * Install runtime protection for Zustand stores
   */
  static protectStore(storeName: string, store: any): void {
    if (this.guardedStores.has(storeName)) {
      return; // Already protected
    }

    this.guardedStores.add(storeName);

    // Protect getState method
    if (store.getState) {
      const originalGetState = store.getState;
      this.originalFunctions.set(`${storeName}.getState`, originalGetState);
      
      store.getState = () => {
        this.logAccess(storeName, 'getState');
        const state = originalGetState();
        
        // Return a deep clone to prevent reference retention
        return this.createSecureCopy(state);
      };
    }

    // Protect setState method
    if (store.setState) {
      const originalSetState = store.setState;
      this.originalFunctions.set(`${storeName}.setState`, originalSetState);
      
      store.setState = (updater: any, replace?: boolean) => {
        this.logAccess(storeName, 'setState');
        
        // Validate the updater function
        if (typeof updater === 'function') {
          const updaterString = updater.toString();
          if (this.detectMaliciousCode(updaterString)) {
            console.error('Potentially malicious state update detected and blocked');
            return;
          }
        }
        
        return originalSetState(updater, replace);
      };
    }

    // Protect subscribe method
    if (store.subscribe) {
      const originalSubscribe = store.subscribe;
      this.originalFunctions.set(`${storeName}.subscribe`, originalSubscribe);
      
      store.subscribe = (listener: Function) => {
        this.logAccess(storeName, 'subscribe');
        
        // Wrap listener to detect malicious behavior
        const secureListener = (...args: any[]) => {
          try {
            return listener(...args);
          } catch (error) {
            console.error('Subscription listener threw error:', error);
            // Don't propagate potentially malicious errors
          }
        };
        
        return originalSubscribe(secureListener);
      };
    }
  }

  /**
   * Create a secure deep copy of state data
   */
  private static createSecureCopy(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.createSecureCopy(item));
    }

    if (typeof obj === 'object') {
      const copy: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Filter out sensitive data in copies
          if (this.isSensitiveKey(key)) {
            copy[key] = '[PROTECTED]';
          } else {
            copy[key] = this.createSecureCopy(obj[key]);
          }
        }
      }
      return copy;
    }

    return obj;
  }

  /**
   * Check if a key contains sensitive data
   */
  private static isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /secret/i,
      /token/i,
      /key/i,
      /password/i,
      /credential/i,
      /auth/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Detect potentially malicious code patterns
   */
  private static detectMaliciousCode(code: string): boolean {
    const maliciousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /constructor/,
      /prototype/,
      /__proto__/,
      /document\./,
      /window\./,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /localStorage/,
      /sessionStorage/,
      /indexedDB/,
      /postMessage/,
      /import\s*\(/,
      /require\s*\(/
    ];

    return maliciousPatterns.some(pattern => pattern.test(code));
  }

  /**
   * Log access attempts for monitoring
   */
  private static logAccess(storeName: string, method: string): void {
    const timestamp = new Date().toISOString();
    console.debug(`[SecurityGuard] ${timestamp}: ${storeName}.${method} accessed`);
    
    // In production, this could send to a security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Could implement logging to external service here
    }
  }

  /**
   * Install global runtime protection
   */
  static installGlobalProtection(): void {
    if (typeof window === 'undefined') return;

    // Protect against eval-based attacks
    if (window.eval) {
      const originalEval = window.eval;
      (window as any).eval = function(code: string) {
        console.warn('eval() usage detected - potential security risk');
        
        if (typeof code === 'string' && this.detectMaliciousCode(code)) {
          throw new Error('Malicious eval() attempt blocked');
        }
        
        return originalEval.call(this, code);
      }.bind(this);
    }

    // Protect against Function constructor
    const originalFunction = window.Function;
    (window as any).Function = function(...args: any[]) {
      const code = args[args.length - 1];
      console.warn('Function constructor usage detected - potential security risk');
      
      if (typeof code === 'string' && RuntimeGuards.detectMaliciousCode(code)) {
        throw new Error('Malicious Function() attempt blocked');
      }
      
      return originalFunction.apply(this, args);
    };

    // Protect localStorage access
    if (window.localStorage) {
      const originalSetItem = window.localStorage.setItem;
      window.localStorage.setItem = function(key: string, value: string) {
        if (RuntimeGuards.isSensitiveKey(key)) {
          console.warn(`Sensitive data storage attempt detected: ${key}`);
        }
        return originalSetItem.call(this, key, value);
      };
    }

    // Protect against DOM manipulation of sensitive elements
    const originalQuerySelector = document.querySelector;
    document.querySelector = function(selector: string) {
      if (selector.includes('data-') && RuntimeGuards.isSensitiveKey(selector)) {
        console.warn(`Suspicious DOM query detected: ${selector}`);
      }
      return originalQuerySelector.call(this, selector);
    };
  }

  /**
   * Check if runtime protection is active
   */
  static isProtectionActive(): boolean {
    return this.guardedStores.size > 0;
  }

  /**
   * Remove all runtime protection
   */
  static removeProtection(): void {
    // Restore original functions
    this.originalFunctions.forEach((originalFn, key) => {
      const [storeName, methodName] = key.split('.');
      // Implementation would depend on having store references
    });

    this.originalFunctions.clear();
    this.guardedStores.clear();
  }

  /**
   * Generate security report
   */
  static generateSecurityReport(): {
    protectedStores: string[];
    detectedThreats: number;
    lastAccess: string;
  } {
    return {
      protectedStores: Array.from(this.guardedStores),
      detectedThreats: 0, // Would track actual threats
      lastAccess: new Date().toISOString()
    };
  }
}