import { API } from '~/constants';

export interface VariableContext {
  collection?: Record<string, string>;
  environment?: Record<string, string>;
  globals?: Record<string, string>;
  secrets?: Record<string, string>;
}

export class VariableResolver {
  private static readonly MAX_DEPTH = 10;
  private static readonly VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;
  
  /**
   * System variables that are dynamically generated
   */
  private static readonly SYSTEM_VARIABLES: Record<string, () => string> = {
    '$timestamp': () => Date.now().toString(),
    '$isoTimestamp': () => new Date().toISOString(),
    '$randomInt': () => Math.floor(Math.random() * API.RANDOM_INT_MAX).toString(),
    '$guid': () => crypto.randomUUID(),
    '$random': () => Math.random().toString(),
  };

  /**
   * Resolve all variables in a string with recursive resolution
   */
  static resolve(text: string, context: VariableContext): string {
    if (!text || typeof text !== 'string') {
      return text;
    }
    
    let resolved = text;
    let depth = 0;
    const seenVariables = new Set<string>();
    
    // Keep resolving until no more variables or max depth reached
    while (this.containsVariables(resolved) && depth < this.MAX_DEPTH) {
      const beforeResolve = resolved;
      
      resolved = resolved.replace(this.VARIABLE_PATTERN, (match, variableName) => {
        const trimmedName = variableName.trim();
        
        // Check for circular reference
        if (seenVariables.has(trimmedName)) {
          console.warn(`Circular reference detected for variable: ${trimmedName}`);
          return match;
        }
        
        seenVariables.add(trimmedName);
        const value = this.getVariable(trimmedName, context);
        seenVariables.delete(trimmedName);
        
        return value !== undefined ? value : match;
      });
      
      // If nothing changed, break to avoid infinite loop
      if (beforeResolve === resolved) {
        break;
      }
      
      depth++;
    }
    
    if (depth >= this.MAX_DEPTH) {
      console.warn('Maximum variable resolution depth reached');
    }
    
    return resolved;
  }

  /**
   * Get a single variable value from context
   */
  static getVariable(name: string, context: VariableContext): string | undefined {
    // Check system variables first
    if (name.startsWith('$')) {
      const systemVar = this.SYSTEM_VARIABLES[name];
      if (systemVar) {
        return systemVar();
      }
    }
    
    // Resolution order: Collection → Environment → Secrets → Globals
    if (context.collection?.[name] !== undefined) {
      return context.collection[name];
    }
    
    if (context.environment?.[name] !== undefined) {
      return context.environment[name];
    }
    
    if (context.secrets?.[name] !== undefined) {
      return context.secrets[name];
    }
    
    if (context.globals?.[name] !== undefined) {
      return context.globals[name];
    }
    
    return undefined;
  }

  /**
   * Check if a string contains variables
   */
  static containsVariables(text: string): boolean {
    return this.VARIABLE_PATTERN.test(text);
  }

  /**
   * Resolve variables in an object recursively
   */
  static resolveObject<T extends Record<string, any>>(obj: T, context: VariableContext): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const resolved = Array.isArray(obj) ? [...obj] : { ...obj };
    
    for (const key in resolved) {
      if (Object.prototype.hasOwnProperty.call(resolved, key)) {
        const value = (resolved as any)[key];
        
        if (typeof value === 'string') {
          (resolved as any)[key] = this.resolve(value, context);
        } else if (typeof value === 'object' && value !== null) {
          (resolved as any)[key] = this.resolveObject(value, context);
        }
      }
    }
    
    return resolved as T;
  }

  /**
   * Resolve variables in request headers
   */
  static resolveHeaders(
    headers: Array<{ key: string; value: string; disabled?: boolean }>,
    context: VariableContext
  ): Array<{ key: string; value: string; disabled?: boolean }> {
    return headers.map(header => ({
      ...header,
      key: this.resolve(header.key, context),
      value: this.resolve(header.value, context),
    }));
  }

  /**
   * Resolve variables in a complete request
   */
  static resolveRequest(request: any, context: VariableContext): any {
    const resolved = { ...request };
    
    // Resolve URL
    if (resolved.url) {
      if (typeof resolved.url === 'string') {
        resolved.url = this.resolve(resolved.url, context);
      } else if (resolved.url.raw) {
        resolved.url = {
          ...resolved.url,
          raw: this.resolve(resolved.url.raw, context),
        };
      }
    }
    
    // Resolve headers
    if (resolved.header && Array.isArray(resolved.header)) {
      resolved.header = this.resolveHeaders(resolved.header, context);
    }
    
    // Resolve body
    if (resolved.body) {
      if (resolved.body.raw) {
        resolved.body = {
          ...resolved.body,
          raw: this.resolve(resolved.body.raw, context),
        };
      }
      // Add support for other body modes in the future
    }
    
    // Resolve auth
    if (resolved.auth) {
      resolved.auth = this.resolveObject(resolved.auth, context);
    }
    
    return resolved;
  }

  /**
   * Get all variables used in a text
   */
  static extractVariables(text: string): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    const matches = text.matchAll(this.VARIABLE_PATTERN);
    const variables = new Set<string>();
    
    for (const match of matches) {
      variables.add(match[1].trim());
    }
    
    return Array.from(variables);
  }

  /**
   * Validate variable name
   */
  static isValidVariableName(name: string): boolean {
    // Variable names can contain letters, numbers, underscores, and hyphens
    // They cannot start with $ (reserved for system variables)
    return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name);
  }
}