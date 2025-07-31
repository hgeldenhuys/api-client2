// OpenAPI 3.0/3.1 and Swagger 2.0 Type Definitions

// Common types used across versions
export interface OpenAPIInfo {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
    identifier?: string; // OpenAPI 3.1
  };
  version: string;
}

export interface OpenAPIExternalDocs {
  description?: string;
  url: string;
}

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocs;
}

// OpenAPI 3.0/3.1 Types
export interface OpenAPI30 {
  openapi: string; // "3.0.0", "3.0.1", "3.0.2", "3.0.3", "3.1.0"
  info: OpenAPIInfo;
  jsonSchemaDialect?: string; // OpenAPI 3.1 only
  servers?: OpenAPIServer[];
  paths: OpenAPIPaths;
  webhooks?: Record<string, OpenAPIPathItem | OpenAPIReference>; // OpenAPI 3.1
  components?: OpenAPIComponents;
  security?: OpenAPISecurityRequirement[];
  tags?: OpenAPITag[];
  externalDocs?: OpenAPIExternalDocs;
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
}

export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export type OpenAPIPaths = Record<string, OpenAPIPathItem>;

export interface OpenAPIPathItem {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  put?: OpenAPIOperation;
  post?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  servers?: OpenAPIServer[];
  parameters?: (OpenAPIParameter | OpenAPIReference)[];
}

export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocs;
  operationId?: string;
  parameters?: (OpenAPIParameter | OpenAPIReference)[];
  requestBody?: OpenAPIRequestBody | OpenAPIReference;
  responses: OpenAPIResponses;
  callbacks?: Record<string, OpenAPICallback | OpenAPIReference>;
  deprecated?: boolean;
  security?: OpenAPISecurityRequirement[];
  servers?: OpenAPIServer[];
}

export interface OpenAPIParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean; // query parameters only
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchema | OpenAPIReference;
  example?: any;
  examples?: Record<string, OpenAPIExample | OpenAPIReference>;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, OpenAPIMediaType>;
  required?: boolean;
}

export interface OpenAPIMediaType {
  schema?: OpenAPISchema | OpenAPIReference;
  example?: any;
  examples?: Record<string, OpenAPIExample | OpenAPIReference>;
  encoding?: Record<string, OpenAPIEncoding>;
}

export interface OpenAPIEncoding {
  contentType?: string;
  headers?: Record<string, OpenAPIHeader | OpenAPIReference>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export type OpenAPIResponses = Record<
  string,
  OpenAPIResponse | OpenAPIReference
>;

export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, OpenAPIHeader | OpenAPIReference>;
  content?: Record<string, OpenAPIMediaType>;
  links?: Record<string, OpenAPILink | OpenAPIReference>;
}

export interface OpenAPIHeader {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchema | OpenAPIReference;
  example?: any;
  examples?: Record<string, OpenAPIExample | OpenAPIReference>;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPICallback {
  [expression: string]: OpenAPIPathItem;
}

export interface OpenAPIExample {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

export interface OpenAPILink {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  description?: string;
  server?: OpenAPIServer;
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema | OpenAPIReference>;
  responses?: Record<string, OpenAPIResponse | OpenAPIReference>;
  parameters?: Record<string, OpenAPIParameter | OpenAPIReference>;
  examples?: Record<string, OpenAPIExample | OpenAPIReference>;
  requestBodies?: Record<string, OpenAPIRequestBody | OpenAPIReference>;
  headers?: Record<string, OpenAPIHeader | OpenAPIReference>;
  securitySchemes?: Record<string, OpenAPISecurityScheme | OpenAPIReference>;
  links?: Record<string, OpenAPILink | OpenAPIReference>;
  callbacks?: Record<string, OpenAPICallback | OpenAPIReference>;
  pathItems?: Record<string, OpenAPIPathItem | OpenAPIReference>; // OpenAPI 3.1
}

export interface OpenAPISecurityScheme {
  type: "apiKey" | "http" | "mutualTLS" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string; // apiKey only
  in?: "query" | "header" | "cookie"; // apiKey only
  scheme?: string; // http only
  bearerFormat?: string; // http only
  flows?: OpenAPIOAuthFlows; // oauth2 only
  openIdConnectUrl?: string; // openIdConnect only
}

export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
}

export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export type OpenAPISecurityRequirement = Record<string, string[]>;

export interface OpenAPIReference {
  $ref: string;
  summary?: string; // OpenAPI 3.1
  description?: string; // OpenAPI 3.1
}

// JSON Schema types (used in OpenAPI schemas)
export interface OpenAPISchema {
  // Core schema properties
  title?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean | number;
  minimum?: number;
  exclusiveMinimum?: boolean | number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
  const?: any; // OpenAPI 3.1

  // Type definition
  type?:
    | "null"
    | "boolean"
    | "object"
    | "array"
    | "number"
    | "string"
    | "integer";
  allOf?: (OpenAPISchema | OpenAPIReference)[];
  oneOf?: (OpenAPISchema | OpenAPIReference)[];
  anyOf?: (OpenAPISchema | OpenAPIReference)[];
  not?: OpenAPISchema | OpenAPIReference;
  items?: OpenAPISchema | OpenAPIReference;
  properties?: Record<string, OpenAPISchema | OpenAPIReference>;
  additionalProperties?: boolean | OpenAPISchema | OpenAPIReference;
  description?: string;
  format?: string;
  default?: any;

  // OpenAPI-specific properties
  nullable?: boolean; // OpenAPI 3.0 (deprecated in 3.1)
  discriminator?: OpenAPIDiscriminator;
  readOnly?: boolean;
  writeOnly?: boolean;
  example?: any;
  externalDocs?: OpenAPIExternalDocs;
  deprecated?: boolean;
  xml?: OpenAPIXML;

  // OpenAPI 3.1 specific (JSON Schema 2019-09 compatibility)
  $id?: string;
  $schema?: string;
  $ref?: string;
  $comment?: string;
  examples?: any[]; // OpenAPI 3.1
}

export interface OpenAPIDiscriminator {
  propertyName: string;
  mapping?: Record<string, string>;
}

export interface OpenAPIXML {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

// Swagger 2.0 Types
export interface Swagger20 {
  swagger: "2.0";
  info: SwaggerInfo;
  host?: string;
  basePath?: string;
  schemes?: ("http" | "https" | "ws" | "wss")[];
  consumes?: string[];
  produces?: string[];
  paths: SwaggerPaths;
  definitions?: Record<string, SwaggerSchema>;
  parameters?: Record<string, SwaggerParameter>;
  responses?: Record<string, SwaggerResponse>;
  securityDefinitions?: Record<string, SwaggerSecurityScheme>;
  security?: SwaggerSecurityRequirement[];
  tags?: OpenAPITag[];
  externalDocs?: OpenAPIExternalDocs;
}

export interface SwaggerInfo extends OpenAPIInfo {
  // Swagger 2.0 doesn't have some OpenAPI 3.0 properties
}

export type SwaggerPaths = Record<string, SwaggerPathItem>;

export interface SwaggerPathItem {
  $ref?: string;
  get?: SwaggerOperation;
  put?: SwaggerOperation;
  post?: SwaggerOperation;
  delete?: SwaggerOperation;
  options?: SwaggerOperation;
  head?: SwaggerOperation;
  patch?: SwaggerOperation;
  parameters?: (SwaggerParameter | SwaggerReference)[];
}

export interface SwaggerOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocs;
  operationId?: string;
  consumes?: string[];
  produces?: string[];
  parameters?: (SwaggerParameter | SwaggerReference)[];
  responses: SwaggerResponses;
  schemes?: ("http" | "https" | "ws" | "wss")[];
  deprecated?: boolean;
  security?: SwaggerSecurityRequirement[];
}

export interface SwaggerParameter {
  name: string;
  in: "query" | "header" | "path" | "formData" | "body";
  description?: string;
  required?: boolean;

  // For non-body parameters
  type?: "string" | "number" | "integer" | "boolean" | "array" | "file";
  format?: string;
  allowEmptyValue?: boolean;
  items?: SwaggerItems;
  collectionFormat?: "csv" | "ssv" | "tsv" | "pipes" | "multi";
  default?: any;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  enum?: any[];
  multipleOf?: number;

  // For body parameters
  schema?: SwaggerSchema | SwaggerReference;
}

export interface SwaggerItems {
  type: "string" | "number" | "integer" | "boolean" | "array";
  format?: string;
  items?: SwaggerItems;
  collectionFormat?: "csv" | "ssv" | "tsv" | "pipes" | "multi";
  default?: any;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  enum?: any[];
  multipleOf?: number;
}

export type SwaggerResponses = Record<
  string,
  SwaggerResponse | SwaggerReference
>;

export interface SwaggerResponse {
  description: string;
  schema?: SwaggerSchema | SwaggerReference;
  headers?: Record<string, SwaggerHeader>;
  examples?: Record<string, any>;
}

export interface SwaggerHeader {
  description?: string;
  type: "string" | "number" | "integer" | "boolean" | "array";
  format?: string;
  items?: SwaggerItems;
  collectionFormat?: "csv" | "ssv" | "tsv" | "pipes" | "multi";
  default?: any;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  enum?: any[];
  multipleOf?: number;
}

export interface SwaggerSchema {
  $ref?: string;
  format?: string;
  title?: string;
  description?: string;
  default?: any;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
  type?:
    | "null"
    | "boolean"
    | "object"
    | "array"
    | "number"
    | "string"
    | "integer";
  items?: SwaggerSchema | SwaggerReference;
  allOf?: (SwaggerSchema | SwaggerReference)[];
  properties?: Record<string, SwaggerSchema | SwaggerReference>;
  additionalProperties?: boolean | SwaggerSchema | SwaggerReference;
  discriminator?: string;
  readOnly?: boolean;
  xml?: OpenAPIXML;
  externalDocs?: OpenAPIExternalDocs;
  example?: any;
}

export interface SwaggerSecurityScheme {
  type: "basic" | "apiKey" | "oauth2";
  description?: string;
  name?: string; // apiKey only
  in?: "query" | "header"; // apiKey only
  flow?: "implicit" | "password" | "application" | "accessCode"; // oauth2 only
  authorizationUrl?: string; // oauth2 only
  tokenUrl?: string; // oauth2 only
  scopes?: Record<string, string>; // oauth2 only
}

export type SwaggerSecurityRequirement = Record<string, string[]>;

export interface SwaggerReference {
  $ref: string;
}

// Union types for different OpenAPI versions
export type OpenAPIDocument = OpenAPI30 | Swagger20;
export type OpenAPISchema_Any = OpenAPISchema | SwaggerSchema;
export type OpenAPIParameter_Any = OpenAPIParameter | SwaggerParameter;
export type OpenAPIResponse_Any = OpenAPIResponse | SwaggerResponse;
export type OpenAPIReference_Any = OpenAPIReference | SwaggerReference;

// Utility types for format detection
export interface OpenAPIDetectionResult {
  isOpenAPI: boolean;
  version: "2.0" | "3.0" | "3.1" | null;
  document?: OpenAPIDocument;
  errors?: string[];
}

// Types for conversion between formats
export interface OpenAPIConversionOptions {
  targetVersion?: "2.0" | "3.0" | "3.1";
  preserveExamples?: boolean;
  generateExamples?: boolean;
  includeDeprecated?: boolean;
  baseUrl?: string;
}
