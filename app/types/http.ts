// HTTP File Format Type Definitions
// Supports .http and .rest files commonly used in IDEs like JetBrains and VS Code

// Core HTTP file structure
export interface HTTPFile {
  requests: HTTPRequest[];
  variables?: Record<string, string>;
  environment?: string;
  metadata?: HTTPFileMetadata;
}

export interface HTTPFileMetadata {
  filename?: string;
  encoding?: string;
  created?: string;
  modified?: string;
  description?: string;
  version?: string;
}

// Individual HTTP request definition
export interface HTTPRequest {
  id?: string;
  name?: string;
  description?: string;
  method: HTTPMethod;
  url: string;
  headers?: HTTPHeader[];
  body?: HTTPRequestBody;
  variables?: Record<string, string>;
  preRequestScript?: string;
  tests?: string;
  metadata?: HTTPRequestMetadata;
}

export type HTTPMethod = 
  | 'GET' 
  | 'POST' 
  | 'PUT' 
  | 'PATCH' 
  | 'DELETE' 
  | 'HEAD' 
  | 'OPTIONS' 
  | 'TRACE' 
  | 'CONNECT';

export interface HTTPHeader {
  name: string;
  value: string;
  enabled?: boolean;
  description?: string;
}

export interface HTTPRequestBody {
  type: HTTPBodyType;
  content: string;
  filename?: string; // For file uploads
  contentType?: string;
}

export type HTTPBodyType = 
  | 'text'
  | 'json'
  | 'xml' 
  | 'html'
  | 'javascript'
  | 'form-data'
  | 'form-urlencoded'
  | 'binary'
  | 'graphql';

export interface HTTPRequestMetadata {
  lineNumber?: number;
  position?: number;
  tags?: string[];
  group?: string;
  timeout?: number;
  followRedirects?: boolean;
  certificates?: HTTPCertificate[];
}

export interface HTTPCertificate {
  path: string;
  password?: string;
  type?: 'p12' | 'pem';
}

// HTTP file parsing result
export interface HTTPFileParseResult {
  success: boolean;
  file?: HTTPFile;
  errors?: HTTPParseError[];
  warnings?: HTTPParseWarning[];
}

export interface HTTPParseError {
  message: string;
  line?: number;
  column?: number;
  code?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface HTTPParseWarning {
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

// HTTP file export options
export interface HTTPFileExportOptions {
  includeComments?: boolean;
  includeVariables?: boolean;
  includeMetadata?: boolean;
  formatBody?: boolean;
  indentSize?: number;
  lineEnding?: 'lf' | 'crlf' | 'cr';
  includeRequestNames?: boolean;
  groupByTags?: boolean;
  variableFormat?: 'inline' | 'environment' | 'both';
}

// Variable and environment support
export interface HTTPEnvironment {
  name: string;
  variables: Record<string, HTTPVariable>;
  baseUrl?: string;
  description?: string;
  active?: boolean;
}

export interface HTTPVariable {
  value: string;
  description?: string;
  sensitive?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'file';
}

// HTTP file template definitions
export interface HTTPFileTemplate {
  name: string;
  description: string;
  content: string;
  variables?: Record<string, HTTPVariable>;
  category?: string;
  tags?: string[];
}

// Built-in templates
export const HTTP_FILE_TEMPLATES: HTTPFileTemplate[] = [
  {
    name: 'REST API Collection',
    description: 'Basic REST API requests (GET, POST, PUT, DELETE)',
    category: 'REST',
    content: `### Get all users
GET {{baseUrl}}/users
Accept: application/json
Authorization: Bearer {{token}}

### Create new user
POST {{baseUrl}}/users
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "John Doe",
  "email": "john@example.com"
}

### Get user by ID
GET {{baseUrl}}/users/{{userId}}
Accept: application/json
Authorization: Bearer {{token}}

### Update user
PUT {{baseUrl}}/users/{{userId}}
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}

### Delete user
DELETE {{baseUrl}}/users/{{userId}}
Authorization: Bearer {{token}}`,
    variables: {
      baseUrl: { value: 'https://api.example.com', description: 'API base URL' },
      token: { value: '', description: 'Bearer token', sensitive: true },
      userId: { value: '1', description: 'User ID for operations' }
    }
  },
  {
    name: 'GraphQL API',
    description: 'GraphQL query and mutation examples',
    category: 'GraphQL',
    content: `### GraphQL Query
POST {{graphqlUrl}}
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "query": "query GetUsers { users { id name email } }"
}

### GraphQL Mutation
POST {{graphqlUrl}}
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "query": "mutation CreateUser($input: UserInput!) { createUser(input: $input) { id name email } }",
  "variables": {
    "input": {
      "name": "New User",
      "email": "newuser@example.com"
    }
  }
}`,
    variables: {
      graphqlUrl: { value: 'https://api.example.com/graphql', description: 'GraphQL endpoint' },
      token: { value: '', description: 'Bearer token', sensitive: true }
    }
  },
  {
    name: 'File Upload',
    description: 'File upload with multipart/form-data',
    category: 'Upload',
    content: `### Upload file
POST {{baseUrl}}/upload
Content-Type: multipart/form-data; boundary=boundary123
Authorization: Bearer {{token}}

--boundary123
Content-Disposition: form-data; name="file"; filename="example.txt"
Content-Type: text/plain

< ./example.txt

--boundary123
Content-Disposition: form-data; name="description"

File upload example
--boundary123--`,
    variables: {
      baseUrl: { value: 'https://api.example.com', description: 'API base URL' },
      token: { value: '', description: 'Bearer token', sensitive: true }
    }
  }
];

// HTTP file validation
export interface HTTPFileValidationResult {
  valid: boolean;
  errors: HTTPParseError[];
  warnings: HTTPParseWarning[];
  requestCount: number;
  variableCount: number;
  duplicateNames?: string[];
  missingVariables?: string[];
}

// HTTP file conversion options (for importing/exporting to other formats)
export interface HTTPFileConversionOptions {
  preserveComments?: boolean;
  generateRequestNames?: boolean;
  createCollection?: boolean;
  collectionName?: string;
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  variablePrefix?: string;
  groupingStrategy?: 'none' | 'by-method' | 'by-path' | 'by-tag';
}

// HTTP file parsing context
export interface HTTPParseContext {
  filename?: string;
  currentLine: number;
  currentColumn: number;
  variables: Record<string, string>;
  environment?: HTTPEnvironment;
  strict?: boolean;
  maxRequestSize?: number;
  allowedMethods?: HTTPMethod[];
}

// HTTP file formatting options
export interface HTTPFileFormatOptions {
  indentSize: number;
  useSpaces: boolean;
  maxLineLength?: number;
  sortHeaders?: boolean;
  normalizeHeaderNames?: boolean;
  preserveComments: boolean;
  addBlankLines?: boolean;
  headerCase?: 'original' | 'lowercase' | 'titlecase' | 'uppercase';
}

// HTTP file statistics
export interface HTTPFileStats {
  totalRequests: number;
  methodCounts: Record<HTTPMethod, number>;
  uniqueHosts: string[];
  variableCount: number;
  headerCount: number;
  bodyCount: number;
  commentLines: number;
  totalLines: number;
  estimatedSize: number;
}

// HTTP file import/export progress tracking
export interface HTTPFileProgress {
  total: number;
  completed: number;
  currentRequest?: string;
  errors: HTTPParseError[];
  warnings: HTTPParseWarning[];
  stage: 'parsing' | 'validating' | 'converting' | 'complete';
}