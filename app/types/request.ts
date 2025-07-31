import { HttpMethod } from "./postman";

export interface RequestExecution {
  id: string;
  requestId: string;
  timestamp: number;
  duration: number;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  size: number;
  error?: string;
  isCorsError?: boolean;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  type: "default" | "secret";
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  color?: string;
}

export interface CollectionMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  version: string;
  // Per-collection app state
  activeRequestId?: string | null;
  activeEnvironmentId?: string | null;
  openTabs?: string[]; // Array of request IDs
  expandedFolders?: string[]; // Array of folder IDs that are expanded
}

export interface AppState {
  collections: Map<string, CollectionWithMetadata>;
  activeCollectionId: string | null;
  activeRequestId: string | null;
  activeEnvironmentId: string | null;
  environments: Map<string, Environment>;
  requestHistory: RequestExecution[];
}

export interface CollectionWithMetadata {
  collection: import("./postman").PostmanCollection;
  metadata: CollectionMetadata;
}

export interface RequestTab {
  id: string;
  collectionId: string;
  requestId: string;
  name: string;
  method: HttpMethod;
  isDirty: boolean;
}

export interface ScriptResult {
  tests: TestResult[];
  consoleOutput: string[];
  error?: string;
  requestUpdates?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  };
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}
