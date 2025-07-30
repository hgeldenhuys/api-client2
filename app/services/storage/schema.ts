import { DBSchema } from 'idb';
import type { PostmanCollection } from '~/types/postman';
import type { Environment } from '~/stores/environmentStore';
import type { TestResult } from '~/types/request';

export interface CollectionWithMetadata {
  id: string;
  collection: PostmanCollection;
  createdAt: Date;
  updatedAt: Date;
  isEncrypted: boolean;
  encryptedFields?: string[]; // Track which fields are encrypted
}

export interface RequestExecution {
  id: string;
  collectionId: string;
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
  };
  testResults?: TestResult[];
  timestamp: Date;
  environmentId?: string;
}

export interface StoredEnvironment extends Environment {
  isEncrypted: boolean;
  encryptedVariables?: string[]; // Track which variables are encrypted
}

export interface StoredGlobalVariables {
  variables: import('~/stores/environmentStore').EnvironmentVariable[];
  isEncrypted: boolean;
  encryptedFields?: string[]; // Track which fields are encrypted (e.g., "0.value", "2.value")
}

export interface ApiClientDB extends DBSchema {
  collections: {
    key: string;
    value: CollectionWithMetadata;
    indexes: { 
      'by-name': string;
      'by-updated': Date;
    };
  };
  environments: {
    key: string;
    value: StoredEnvironment;
    indexes: {
      'by-name': string;
    };
  };
  history: {
    key: string;
    value: RequestExecution;
    indexes: { 
      'by-collection': string;
      'by-request': string;
      'by-timestamp': Date;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: any;
    };
  };
}

export const DB_NAME = 'api-client-db';
export const DB_VERSION = 1;

// Fields that should be encrypted
export const SENSITIVE_FIELDS = {
  collection: [
    'auth',
    'variable', // Variables that might contain secrets
  ],
  environment: [
    'values', // Environment variable values
  ],
  request: [
    'auth',
    'header', // Headers might contain API keys
  ],
  globalVariables: [
    'value', // Global variable values marked as secrets
  ],
};