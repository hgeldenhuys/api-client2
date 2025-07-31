import type {
  WorkerMessage,
  WorkerResult,
  TestResult,
  ScriptResult,
  ScriptRequestContext,
  AuthContext,
} from "~/types/script";
import { TIMEOUTS } from "~/constants";

export class ScriptExecutor {
  private worker: Worker | null = null;
  private initializationError: string | null = null;
  private pendingExecutions: Map<
    string,
    {
      resolve: (result: ScriptResult) => void;
      reject: (error: Error) => void;
    }
  > = new Map();

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      // Create worker from the scriptWorker file
      this.worker = new Worker(
        new URL("../workers/scriptWorker.ts", import.meta.url),
        { type: "module" },
      );

      this.worker.addEventListener(
        "message",
        this.handleWorkerMessage.bind(this),
      );
      this.worker.addEventListener("error", this.handleWorkerError.bind(this));

      // Clear any previous initialization error
      this.initializationError = null;
    } catch (error) {
      console.error("Failed to initialize script worker:", error);
      this.initializationError = `Failed to initialize script worker: ${error instanceof Error ? error.message : String(error)}`;
      this.worker = null;
    }
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResult>) {
    const {
      id,
      type,
      tests,
      consoleOutput,
      error,
      environmentUpdates,
      globalUpdates,
      requestUpdates,
    } = event.data;
    const pending = this.pendingExecutions.get(id);

    if (!pending) {
      console.warn("Received message for unknown execution:", id);
      return;
    }

    this.pendingExecutions.delete(id);

    if (type === "error") {
      // Don't reject - return the error as a result so it can be displayed
      const errorMessage = error ?? "Unknown script error";
      const result: ScriptResult = {
        tests: tests ?? [],
        consoleOutput: [...(consoleOutput ?? []), `[ERROR] ${errorMessage}`],
        error: errorMessage,
        requestUpdates: requestUpdates,
      };
      pending.resolve(result);
    } else {
      const result: ScriptResult = {
        tests: tests ?? [],
        consoleOutput: consoleOutput ?? [],
        error: undefined,
        requestUpdates: requestUpdates,
      };

      if (requestUpdates) {
        console.log("Script executor received requestUpdates:", requestUpdates);
      }

      // TODO: Apply environment and global updates
      if (environmentUpdates) {
        // Apply to environment store
      }
      if (globalUpdates) {
        // Apply to global variables
      }

      pending.resolve(result);
    }
  }

  private handleWorkerError(event: ErrorEvent) {
    console.error("Script worker error:", event);
    // Reject all pending executions
    this.pendingExecutions.forEach((pending) => {
      pending.reject(new Error("Script worker crashed"));
    });
    this.pendingExecutions.clear();

    // Restart worker
    this.initializeWorker();
  }

  async executePreRequestScript(
    script: string,
    context: {
      request: ScriptRequestContext;
      environment: Record<string, string>;
      collectionVariables: Record<string, string>;
      globals?: Record<string, string>;
    },
  ): Promise<ScriptResult> {
    return this.executeScript(script, {
      ...context,
      response: undefined,
      globals: context.globals ?? {},
    });
  }

  async executeTestScript(
    script: string,
    context: {
      request: ScriptRequestContext;
      response: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: unknown;
        time: number;
      };
      environment: Record<string, string>;
      collectionVariables: Record<string, string>;
      globals?: Record<string, string>;
    },
  ): Promise<ScriptResult> {
    const transformedResponse = {
      code: context.response.status,
      status: context.response.statusText,
      headers: context.response.headers,
      body: context.response.body,
      responseTime: context.response.time,
    };
    return this.executeScript(script, {
      ...context,
      response: transformedResponse,
      globals: context.globals ?? {},
    });
  }

  async executeScript(
    script: string,
    context: {
      request: ScriptRequestContext;
      response?: {
        code: number;
        status: string;
        headers: Record<string, string>;
        body: unknown;
        responseTime: number;
      };
      environment: Record<string, string>;
      globals: Record<string, string>;
    },
  ): Promise<ScriptResult> {
    if (!this.worker) {
      // Return initialization error in console output instead of throwing
      const errorMessage =
        this.initializationError || "Script worker not initialized";
      const consoleMessages = [
        `[ERROR] ${errorMessage}`,
        `[ERROR] Scripts cannot be executed until this issue is resolved.`,
        `[ERROR] Possible causes:`,
        `[ERROR]   - Web Worker support is disabled in your browser`,
        `[ERROR]   - Content Security Policy blocking worker creation`,
        `[ERROR]   - Script worker file failed to load`,
      ];
      return {
        tests: [],
        consoleOutput: consoleMessages,
        error: errorMessage,
        requestUpdates: undefined,
      };
    }

    const id = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return new Promise((resolve, reject) => {
      this.pendingExecutions.set(id, { resolve, reject });

      const message: WorkerMessage = {
        id,
        type: "execute",
        script,
        context,
      };

      this.worker!.postMessage(message);

      // Timeout after script execution timeout
      setTimeout(() => {
        if (this.pendingExecutions.has(id)) {
          this.pendingExecutions.delete(id);
          reject(new Error("Script execution timed out"));
        }
      }, TIMEOUTS.SCRIPT_EXECUTION_TIMEOUT);
    });
  }

  isWorkerHealthy(): boolean {
    return this.worker !== null && this.initializationError === null;
  }

  getInitializationError(): string | null {
    return this.initializationError;
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending executions
    this.pendingExecutions.forEach((pending) => {
      pending.reject(new Error("Script executor terminated"));
    });
    this.pendingExecutions.clear();
  }
}

// Singleton instance
let scriptExecutor: ScriptExecutor | null = null;

export function getScriptExecutor(): ScriptExecutor {
  if (!scriptExecutor) {
    scriptExecutor = new ScriptExecutor();
  }
  return scriptExecutor;
}
