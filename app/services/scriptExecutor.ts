import type { WorkerMessage, WorkerResult, TestResult } from '~/workers/scriptWorker';
import { ScriptResult } from '~/types/request';

export class ScriptExecutor {
  private worker: Worker | null = null;
  private pendingExecutions: Map<string, {
    resolve: (result: ScriptResult) => void;
    reject: (error: Error) => void;
  }> = new Map();
  
  constructor() {
    this.initializeWorker();
  }
  
  private initializeWorker() {
    try {
      // Create worker from the scriptWorker file
      this.worker = new Worker(
        new URL('../workers/scriptWorker.ts', import.meta.url),
        { type: 'module' }
      );
      
      this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
      this.worker.addEventListener('error', this.handleWorkerError.bind(this));
    } catch (error) {
      console.error('Failed to initialize script worker:', error);
    }
  }
  
  private handleWorkerMessage(event: MessageEvent<WorkerResult>) {
    const { id, type, tests, consoleOutput, error, environmentUpdates, globalUpdates, requestUpdates } = event.data;
    const pending = this.pendingExecutions.get(id);
    
    if (!pending) {
      console.warn('Received message for unknown execution:', id);
      return;
    }
    
    this.pendingExecutions.delete(id);
    
    if (type === 'error') {
      pending.reject(new Error(error || 'Unknown script error'));
    } else {
      const result: ScriptResult = {
        tests: tests || [],
        consoleOutput: consoleOutput || [],
        error: undefined,
        requestUpdates: requestUpdates
      };
      
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
    console.error('Script worker error:', event);
    // Reject all pending executions
    this.pendingExecutions.forEach(pending => {
      pending.reject(new Error('Script worker crashed'));
    });
    this.pendingExecutions.clear();
    
    // Restart worker
    this.initializeWorker();
  }
  
  async executePreRequestScript(
    script: string,
    context: {
      request: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: string;
        auth?: any;
      };
      environment: Record<string, string>;
      collectionVariables: Record<string, string>;
      globals?: Record<string, string>;
    }
  ): Promise<ScriptResult> {
    return this.executeScript(script, { ...context, response: undefined, globals: context.globals || {} });
  }
  
  async executeTestScript(
    script: string,
    context: {
      request: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: string;
        auth?: any;
      };
      response: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: any;
        time: number;
      };
      environment: Record<string, string>;
      collectionVariables: Record<string, string>;
      globals?: Record<string, string>;
    }
  ): Promise<ScriptResult> {
    const transformedResponse = {
      code: context.response.status,
      status: context.response.statusText,
      headers: context.response.headers,
      body: context.response.body,
      responseTime: context.response.time
    };
    return this.executeScript(script, { 
      ...context, 
      response: transformedResponse,
      globals: context.globals || {} 
    });
  }
  
  async executeScript(
    script: string,
    context: {
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
    }
  ): Promise<ScriptResult> {
    if (!this.worker) {
      throw new Error('Script worker not initialized');
    }
    
    const id = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      this.pendingExecutions.set(id, { resolve, reject });
      
      const message: WorkerMessage = {
        id,
        type: 'execute',
        script,
        context
      };
      
      this.worker!.postMessage(message);
      
      // Timeout after 35 seconds (5 seconds more than worker timeout)
      setTimeout(() => {
        if (this.pendingExecutions.has(id)) {
          this.pendingExecutions.delete(id);
          reject(new Error('Script execution timed out'));
        }
      }, 35000);
    });
  }
  
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Reject all pending executions
    this.pendingExecutions.forEach(pending => {
      pending.reject(new Error('Script executor terminated'));
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