// Script execution worker
// This runs in an isolated context for security

interface WorkerMessage {
  id: string;
  type: "execute";
  script: string;
  context: ScriptContext;
}

interface ScriptContext {
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
    auth?: any;
  };
  response?: {
    code: number;
    status: string;
    headers: Record<string, string>;
    body: any;
    responseTime: number;
  };
  environment: Record<string, string>;
  globals: Record<string, string>;
  collectionVariables: Record<string, string>;
}

interface WorkerResult {
  id: string;
  type: "result" | "error";
  tests?: TestResult[];
  consoleOutput?: string[];
  error?: string;
  environmentUpdates?: Record<string, string>;
  globalUpdates?: Record<string, string>;
  requestUpdates?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    auth?: any;
  };
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

// Sandboxed execution context
let consoleOutput: string[] = [];
let tests: TestResult[] = [];
let environmentUpdates: Record<string, string> = {};
let globalUpdates: Record<string, string> = {};
let requestUpdates: any = {};

// Override console methods to capture output
const originalConsole = { ...console };
const formatConsoleArgs = (args: any[]) => {
  return args
    .map((arg) =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg),
    )
    .join(" ");
};

console.log = (...args: any[]) => {
  consoleOutput.push(formatConsoleArgs(args));
};
console.info = (...args: any[]) => {
  consoleOutput.push(`[INFO] ${formatConsoleArgs(args)}`);
};
console.warn = (...args: any[]) => {
  consoleOutput.push(`[WARN] ${formatConsoleArgs(args)}`);
};
console.error = (...args: any[]) => {
  consoleOutput.push(`[ERROR] ${formatConsoleArgs(args)}`);
};
console.debug = (...args: any[]) => {
  consoleOutput.push(`[DEBUG] ${formatConsoleArgs(args)}`);
};

// Add alert function
(globalThis as any).alert = (message: any) => {
  consoleOutput.push(`[ALERT] ${String(message)}`);
};

// PM API implementation
function createPMObject(context: ScriptContext) {
  // Create response object with proper property access
  const response = context.response
    ? {
        // Direct properties
        code: context.response.code,
        status: context.response.status,
        headers: context.response.headers,
        body: context.response.body,
        responseTime: context.response.responseTime,

        // Chainable properties for testing
        to: {
          have: {
            status: (expectedStatus: number) => {
              if (context.response!.code !== expectedStatus) {
                throw new Error(
                  `Expected status to be ${expectedStatus}, but got ${context.response!.code}`,
                );
              }
            },
          },
        },
      }
    : undefined;

  // Create a mutable copy of the request for modifications
  const mutableRequest = {
    url: context.request.url,
    method: context.request.method,
    headers: { ...context.request.headers },
    body: context.request.body,
    auth: context.request.auth
      ? JSON.parse(JSON.stringify(context.request.auth))
      : undefined,
  };

  // Create HeaderList implementation
  class HeaderList {
    private headers: Record<string, string> = { ...context.request.headers };

    add(header: { key: string; value: string }) {
      this.headers[header.key] = header.value;
      if (!requestUpdates.headers) requestUpdates.headers = {};
      requestUpdates.headers[header.key] = header.value;
    }

    upsert(header: { key: string; value: string }) {
      this.headers[header.key] = header.value;
      if (!requestUpdates.headers) requestUpdates.headers = {};
      requestUpdates.headers[header.key] = header.value;
    }

    remove(key: string) {
      delete this.headers[key];
      if (!requestUpdates.headers) requestUpdates.headers = {};
      requestUpdates.headers[key] = null; // Mark for deletion
    }

    get(key: string): string | undefined {
      return this.headers[key];
    }

    has(key: string): boolean {
      return key in this.headers;
    }

    each(callback: (header: { key: string; value: string }) => void) {
      Object.entries(this.headers).forEach(([key, value]) => {
        callback({ key, value });
      });
    }

    toObject(): Record<string, string> {
      return { ...this.headers };
    }

    count(): number {
      return Object.keys(this.headers).length;
    }
  }

  const headerList = new HeaderList();

  const pm = {
    request: {
      url: mutableRequest.url,
      method: mutableRequest.method,
      headers: headerList,
      body: mutableRequest.body,

      // Methods to modify the request
      setUrl: (url: string) => {
        mutableRequest.url = url;
        requestUpdates.url = url;
      },

      setMethod: (method: string) => {
        mutableRequest.method = method;
        requestUpdates.method = method;
      },

      addHeader: (key: string, value: string) => {
        headerList.add({ key, value });
      },

      removeHeader: (key: string) => {
        headerList.remove(key);
      },

      setBody: (body: any) => {
        mutableRequest.body = body;
        requestUpdates.body = body;
      },

      auth: mutableRequest.auth,

      setAuth: (auth: any) => {
        mutableRequest.auth = auth;
        requestUpdates.auth = auth;
      },

      updateAuth: (type: string, key: string, value: string) => {
        if (!mutableRequest.auth) {
          mutableRequest.auth = { type };
        }

        // Initialize auth type array if needed
        if (!mutableRequest.auth[type]) {
          mutableRequest.auth[type] = [];
        }

        // Find existing param or add new one
        const param = mutableRequest.auth[type].find((p: any) => p.key === key);
        if (param) {
          param.value = value;
        } else {
          mutableRequest.auth[type].push({ key, value, type: "string" });
        }

        requestUpdates.auth = mutableRequest.auth;
      },

      removeAuth: () => {
        mutableRequest.auth = undefined;
        requestUpdates.auth = null;
      },
    },
    response,

    environment: {
      get: (key: string) => context.environment[key],
      set: (key: string, value: string) => {
        context.environment[key] = value;
        environmentUpdates[key] = value;
      },
      unset: (key: string) => {
        delete context.environment[key];
        environmentUpdates[key] = "";
      },
      has: (key: string) => key in context.environment,
    },

    globals: {
      get: (key: string) => context.globals[key],
      set: (key: string, value: string) => {
        context.globals[key] = value;
        globalUpdates[key] = value;
      },
      unset: (key: string) => {
        delete context.globals[key];
        globalUpdates[key] = "";
      },
      has: (key: string) => key in context.globals,
    },

    collectionVariables: {
      get: (key: string) => context.collectionVariables[key],
      set: (key: string, value: string) => {
        context.collectionVariables[key] = value;
        // Note: Collection variables are typically not persisted from scripts
      },
      unset: (key: string) => {
        delete context.collectionVariables[key];
      },
      has: (key: string) => key in context.collectionVariables,
    },

    test: (name: string, fn: () => void) => {
      try {
        fn();
        tests.push({ name, passed: true });
      } catch (error) {
        tests.push({
          name,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    expect: (actual: any) => {
      return new ChaiExpect(actual);
    },

    sendRequest: async (options: any) => {
      // This will be intercepted by the main thread
      throw new Error(
        "pm.sendRequest is not yet implemented in script execution",
      );
    },
  };

  return pm;
}

// Simplified Chai-like assertion library
class ChaiExpect {
  private actual: any;
  private negated: boolean = false;

  constructor(actual: any) {
    this.actual = actual;
  }

  get not() {
    this.negated = true;
    return this;
  }

  get to() {
    return this;
  }

  get be() {
    return this;
  }

  get have() {
    return this;
  }

  equal(expected: any) {
    const isEqual = this.actual === expected;
    if (this.negated ? isEqual : !isEqual) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to equal ${expected}`,
      );
    }
  }

  eql(expected: any) {
    const isEqual = JSON.stringify(this.actual) === JSON.stringify(expected);
    if (this.negated ? isEqual : !isEqual) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} ${this.negated ? "not " : ""}to deep equal ${JSON.stringify(expected)}`,
      );
    }
  }

  a(type: string) {
    let actualType = typeof this.actual;
    let isType = false;

    // Special handling for arrays
    if (type === "array") {
      isType = Array.isArray(this.actual);
    } else if (type === "object" && this.actual !== null) {
      // For object, ensure it's not an array
      isType = actualType === "object" && !Array.isArray(this.actual);
    } else {
      isType = actualType === type;
    }

    if (this.negated ? isType : !isType) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to be a ${type}`,
      );
    }
  }

  an(type: string) {
    this.a(type);
  }

  get ok() {
    if (this.negated ? this.actual : !this.actual) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to be truthy`,
      );
    }
    return this;
  }

  get true() {
    if (this.negated ? this.actual === true : this.actual !== true) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to be true`,
      );
    }
    return this;
  }

  get false() {
    if (this.negated ? this.actual === false : this.actual !== false) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to be false`,
      );
    }
    return this;
  }

  get null() {
    if (this.negated ? this.actual === null : this.actual !== null) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to be null`,
      );
    }
    return this;
  }

  get undefined() {
    if (this.negated ? this.actual === undefined : this.actual !== undefined) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to be undefined`,
      );
    }
    return this;
  }

  above(n: number) {
    if (this.negated ? this.actual > n : this.actual <= n) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to be above ${n}`,
      );
    }
  }

  below(n: number) {
    if (this.negated ? this.actual < n : this.actual >= n) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to be below ${n}`,
      );
    }
  }

  include(value: any) {
    let includes = false;
    if (typeof this.actual === "string") {
      includes = this.actual.includes(value);
    } else if (Array.isArray(this.actual)) {
      includes = this.actual.includes(value);
    } else if (typeof this.actual === "object" && this.actual !== null) {
      includes = value in this.actual;
    }

    if (this.negated ? includes : !includes) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} ${this.negated ? "not " : ""}to include ${JSON.stringify(value)}`,
      );
    }
  }

  match(pattern: RegExp) {
    const matches = pattern.test(String(this.actual));
    if (this.negated ? matches : !matches) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to match ${pattern}`,
      );
    }
  }

  property(name: string, value?: any) {
    const hasProperty = name in this.actual;
    if (this.negated ? hasProperty : !hasProperty) {
      throw new Error(
        `Expected object ${this.negated ? "not " : ""}to have property ${name}`,
      );
    }

    if (value !== undefined) {
      const propertyValue = this.actual[name];
      if (this.negated ? propertyValue === value : propertyValue !== value) {
        throw new Error(
          `Expected property ${name} ${this.negated ? "not " : ""}to equal ${value}`,
        );
      }
    }
  }

  length(n: number) {
    const actualLength = this.actual?.length;
    if (actualLength === undefined) {
      throw new Error(`Expected ${this.actual} to have a length property`);
    }

    if (this.negated ? actualLength === n : actualLength !== n) {
      throw new Error(
        `Expected length ${this.negated ? "not " : ""}to be ${n}, but got ${actualLength}`,
      );
    }
  }

  status(code: number) {
    if (!this.actual || typeof this.actual.code !== "number") {
      throw new Error("Expected object to have a numeric code property");
    }

    if (this.negated ? this.actual.code === code : this.actual.code !== code) {
      throw new Error(
        `Expected status ${this.negated ? "not " : ""}to be ${code}, but got ${this.actual.code}`,
      );
    }
  }

  oneOf(values: any[]) {
    const isOneOf = values.includes(this.actual);
    if (this.negated ? isOneOf : !isOneOf) {
      throw new Error(
        `Expected ${this.actual} ${this.negated ? "not " : ""}to be one of ${JSON.stringify(values)}`,
      );
    }
  }
}

// Message handler
self.addEventListener("message", async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, script, context } = event.data;

  // Reset state
  consoleOutput = [];
  tests = [];
  environmentUpdates = {};
  globalUpdates = {};
  requestUpdates = {};

  if (type === "execute") {
    try {
      // Create PM object
      const pm = createPMObject(context);

      // Create execution function with timeout
      // NOSONAR - Dynamic code execution is required for script functionality in isolated worker
      const executeScript = new Function(
        "pm",
        `
        try {
          ${script}
        } catch (error) {
          // Enhance error messages for common mistakes
          if (error instanceof TypeError && error.message.includes("Cannot read properties of undefined")) {
            // Check for common PM API mistakes
            const errorStr = error.toString();
            if (errorStr.includes("collectionVariables") && errorStr.includes("'get'")) {
              throw new Error("pm.collectionVariables is not available. Did you mean pm.variables or pm.environment?");
            }
            if (errorStr.includes("variables") && errorStr.includes("'get'")) {
              throw new Error("pm.variables is not available in pre-request scripts. Use pm.environment, pm.globals, or pm.collectionVariables instead.");
            }
          }
          throw error;
        }
      `,
      );

      // Set up timeout
      const timeoutId = setTimeout(() => {
        throw new Error("Script execution timed out after 30 seconds");
      }, 30000);

      try {
        // Execute the script
        await executeScript(pm);
        clearTimeout(timeoutId);

        // Send successful result
        const result: WorkerResult = {
          id,
          type: "result",
          tests,
          consoleOutput,
          environmentUpdates:
            Object.keys(environmentUpdates).length > 0
              ? environmentUpdates
              : undefined,
          globalUpdates:
            Object.keys(globalUpdates).length > 0 ? globalUpdates : undefined,
          requestUpdates:
            Object.keys(requestUpdates).length > 0 ? requestUpdates : undefined,
        };

        self.postMessage(result);
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      // Enhanced error handling for common mistakes
      let errorMessage = error instanceof Error ? error.message : String(error);

      // Check for common syntax errors
      if (errorMessage.includes("Invalid left-hand side in assignment")) {
        // Check if it's the common header mistake
        if (
          script.includes(".headers.add(") ||
          script.includes(".headers.upsert(")
        ) {
          errorMessage = `Syntax Error: Header methods require an object parameter.
Example: pm.request.headers.add({ key: 'Header-Name', value: 'Header-Value' })
Your code appears to be using: methodName() = value, which is invalid JavaScript.`;
        }
      }

      // Send error result
      const result: WorkerResult = {
        id,
        type: "error",
        error: errorMessage,
        consoleOutput,
        tests,
      };

      self.postMessage(result);
    }
  }
});

// Export types for main thread
export type { WorkerMessage, WorkerResult, TestResult };
