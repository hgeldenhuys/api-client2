// Script execution types

export interface ScriptRequestContext {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | Record<string, unknown> | FormData;
  auth?: AuthContext;
}

export interface ScriptResponseContext {
  code: number;
  status: string;
  headers: Record<string, string>;
  body: unknown;
  responseTime: number;
}

export interface AuthContext {
  type: string;
  [key: string]: AuthParam[] | string | undefined;
}

export interface AuthParam {
  key: string;
  value: string;
  type: string;
}

export interface FormDataParameter {
  key: string;
  value: string;
  type: "text" | "file";
  src?: string; // For file type
  description?: string;
  disabled?: boolean;
}

export interface ScriptExecutionContext {
  request: ScriptRequestContext;
  response?: ScriptResponseContext;
  environment: Record<string, string>;
  globals: Record<string, string>;
  collectionVariables?: Record<string, string>;
}

export interface RequestUpdates {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
  auth?: AuthContext | null;
}

export interface WorkerMessage {
  id: string;
  type: "execute";
  script: string;
  context: ScriptExecutionContext;
}

export interface WorkerResult {
  id: string;
  type: "result" | "error";
  tests?: TestResult[];
  consoleOutput?: string[];
  error?: string;
  environmentUpdates?: Record<string, string>;
  globalUpdates?: Record<string, string>;
  requestUpdates?: RequestUpdates;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface ScriptResult {
  tests: TestResult[];
  consoleOutput: string[];
  error?: string;
  requestUpdates?: RequestUpdates;
}
