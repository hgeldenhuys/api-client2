import type { PostmanCollection, RequestItem, FolderItem, RequestAuth } from '~/types/postman';
import type { 
  OpenAPI30, 
  Swagger20, 
  OpenAPIDocument,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponse,
  OpenAPISchema,
  OpenAPISecurityScheme,
  OpenAPIConversionOptions
} from '~/types/openapi';

export interface OpenAPIExportResult {
  success: boolean;
  document?: OpenAPIDocument;
  error?: string;
  warnings?: string[];
}

export interface OpenAPIExportOptions {
  version?: '2.0' | '3.0' | '3.1';
  title?: string;
  description?: string;
  version_info?: string;
  servers?: Array<{ url: string; description?: string }>;
  includeExamples?: boolean;
  generateSchemas?: boolean;
  groupByTags?: boolean;
  includeSensitiveData?: boolean;
  baseUrl?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export class OpenAPIExporter {
  /**
   * Exports a Postman collection as OpenAPI document
   */
  static async export(
    collection: PostmanCollection,
    options: OpenAPIExportOptions = {}
  ): Promise<OpenAPIExportResult> {
    try {
      const {
        version = '3.0',
        title,
        description,
        version_info = '1.0.0',
        servers,
        includeExamples = true,
        generateSchemas = true,
        groupByTags = false,
        baseUrl
      } = options;

      const warnings: string[] = [];

      // Create base document structure
      let document: OpenAPIDocument;

      if (version === '2.0') {
        document = this.createSwaggerDocument(collection, options, warnings);
      } else {
        document = this.createOpenAPIDocument(collection, options, warnings);
      }

      return {
        success: true,
        document,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Exports to file download
   */
  static async exportToFile(
    collection: PostmanCollection,
    options: OpenAPIExportOptions = {},
    format: 'json' | 'yaml' = 'json'
  ): Promise<void> {
    const result = await this.export(collection, options);
    
    if (!result.success || !result.document) {
      throw new Error(result.error || 'Export failed');
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'yaml') {
      // For now, we'll just output JSON
      // In a real implementation, you'd use a YAML stringifier
      content = JSON.stringify(result.document, null, 2);
      filename = `${collection.info.name.replace(/[^a-z0-9]/gi, '_')}.openapi.yaml`;
      mimeType = 'application/x-yaml';
    } else {
      content = JSON.stringify(result.document, null, 2);
      filename = `${collection.info.name.replace(/[^a-z0-9]/gi, '_')}.openapi.json`;
      mimeType = 'application/json';
    }

    // Create download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Creates OpenAPI 3.0+ document
   */
  private static createOpenAPIDocument(
    collection: PostmanCollection,
    options: OpenAPIExportOptions,
    warnings: string[]
  ): OpenAPI30 {
    const {
      version = '3.0',
      title,
      description,
      version_info = '1.0.0',
      servers,
      baseUrl,
      contact,
      license
    } = options;

    // Extract base URL from requests if not provided
    const extractedBaseUrl = baseUrl || this.extractBaseUrl(collection);
    
    const document: OpenAPI30 = {
      openapi: version === '3.1' ? '3.1.0' : '3.0.3',
      info: {
        title: title || collection.info.name,
        description: description || collection.info.description,
        version: version_info,
        contact,
        license
      },
      servers: servers || (extractedBaseUrl ? [{ url: extractedBaseUrl }] : []),
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {}
      }
    };

    // Process requests
    const pathGroups = this.groupRequestsByPath(collection.item);
    
    Object.entries(pathGroups).forEach(([path, requests]) => {
      const pathItem: any = {};
      
      requests.forEach(request => {
        const operation = this.convertRequestToOpenAPIOperation(request, options, warnings);
        if (operation) {
          pathItem[request.request.method.toLowerCase()] = operation;
        }
      });
      
      if (Object.keys(pathItem).length > 0) {
        document.paths[path] = pathItem;
      }
    });

    // Add collection-level auth as security scheme
    if (collection.auth) {
      const securityScheme = this.convertPostmanAuthToOpenAPI(collection.auth);
      if (securityScheme) {
        document.components!.securitySchemes!['defaultAuth'] = securityScheme;
        document.security = [{ defaultAuth: [] }];
      }
    }

    return document;
  }

  /**
   * Creates Swagger 2.0 document
   */
  private static createSwaggerDocument(
    collection: PostmanCollection,
    options: OpenAPIExportOptions,
    warnings: string[]
  ): Swagger20 {
    const {
      title,
      description,
      version_info = '1.0.0',
      baseUrl,
      contact,
      license
    } = options;

    warnings.push('Swagger 2.0 export has limited feature support compared to OpenAPI 3.0+');

    // Extract base URL components
    const extractedBaseUrl = baseUrl || this.extractBaseUrl(collection);
    let host = '';
    let basePath = '';
    let schemes: ('http' | 'https')[] = ['https'];

    if (extractedBaseUrl) {
      try {
        const url = new URL(extractedBaseUrl);
        host = url.host;
        basePath = url.pathname;
        schemes = [url.protocol.replace(':', '') as 'http' | 'https'];
      } catch {
        warnings.push(`Invalid base URL: ${extractedBaseUrl}`);
      }
    }

    const document: Swagger20 = {
      swagger: '2.0',
      info: {
        title: title || collection.info.name,
        description: description || collection.info.description,
        version: version_info,
        contact,
        license
      },
      host,
      basePath,
      schemes,
      paths: {},
      definitions: {}
    };

    // Process requests (simplified for Swagger 2.0)
    const pathGroups = this.groupRequestsByPath(collection.item);
    
    Object.entries(pathGroups).forEach(([path, requests]) => {
      const pathItem: any = {};
      
      requests.forEach(request => {
        const operation = this.convertRequestToSwaggerOperation(request, options, warnings);
        if (operation) {
          pathItem[request.request.method.toLowerCase()] = operation;
        }
      });
      
      if (Object.keys(pathItem).length > 0) {
        document.paths[path] = pathItem;
      }
    });

    return document;
  }

  /**
   * Groups requests by their path pattern
   */
  private static groupRequestsByPath(items: (RequestItem | FolderItem)[]): Record<string, RequestItem[]> {
    const groups: Record<string, RequestItem[]> = {};

    const processItems = (items: (RequestItem | FolderItem)[]) => {
      items.forEach(item => {
        if ('item' in item && Array.isArray(item.item)) {
          // It's a folder, process recursively
          processItems(item.item);
        } else if ('request' in item) {
          // It's a request
          const path = this.extractPathFromUrl(item.request.url);
          if (path) {
            if (!groups[path]) {
              groups[path] = [];
            }
            groups[path].push(item);
          }
        }
      });
    };

    processItems(items);
    return groups;
  }

  /**
   * Extracts path pattern from Postman URL
   */
  private static extractPathFromUrl(url: any): string | null {
    try {
      let urlString = '';
      
      if (typeof url === 'string') {
        urlString = url;
      } else if (url && url.raw) {
        urlString = url.raw;
      } else {
        return null;
      }

      // Remove base URL and query parameters
      const urlObj = new URL(urlString.startsWith('http') ? urlString : `https://example.com${urlString}`);
      let path = urlObj.pathname;

      // Convert Postman variables to OpenAPI path parameters
      path = path.replace(/\{\{([^}]+)\}\}/g, '{$1}');

      return path || '/';
    } catch {
      return null;
    }
  }

  /**
   * Extracts base URL from collection requests
   */
  private static extractBaseUrl(collection: PostmanCollection): string | undefined {
    const processItems = (items: (RequestItem | FolderItem)[]): string | undefined => {
      for (const item of items) {
        if ('item' in item && Array.isArray(item.item)) {
          const result = processItems(item.item);
          if (result) return result;
        } else if ('request' in item) {
          const url = typeof item.request.url === 'string' 
            ? item.request.url 
            : item.request.url?.raw;
          
          if (url && url.startsWith('http')) {
            try {
              const urlObj = new URL(url);
              return `${urlObj.protocol}//${urlObj.host}`;
            } catch {
              continue;
            }
          }
        }
      }
      return undefined;
    };

    return processItems(collection.item);
  }

  /**
   * Converts Postman request to OpenAPI operation
   */
  private static convertRequestToOpenAPIOperation(
    request: RequestItem,
    options: OpenAPIExportOptions,
    warnings: string[]
  ): OpenAPIOperation | null {
    try {
      const operation: OpenAPIOperation = {
        summary: request.name,
        description: request.request.description,
        responses: {
          '200': {
            description: 'Successful response'
          }
        }
      };

      // Add operation ID
      operation.operationId = this.generateOperationId(request);

      // Convert parameters
      const parameters: OpenAPIParameter[] = [];

      // Add query parameters
      if (request.request.url && typeof request.request.url === 'object' && request.request.url.query) {
        request.request.url.query.forEach(param => {
          parameters.push({
            name: param.key,
            in: 'query',
            description: param.description,
            required: false,
            schema: { type: 'string' }
          });
        });
      }

      // Add header parameters (excluding common headers)
      if (request.request.header) {
        request.request.header.forEach(header => {
          if (!this.isCommonHeader(header.key)) {
            parameters.push({
              name: header.key,
              in: 'header',
              description: header.description,
              required: false,
              schema: { type: 'string' }
            });
          }
        });
      }

      // Add path parameters (extracted from URL template)
      const pathParams = this.extractPathParameters(request.request.url);
      pathParams.forEach(param => {
        parameters.push({
          name: param,
          in: 'path',
          required: true,
          schema: { type: 'string' }
        });
      });

      if (parameters.length > 0) {
        operation.parameters = parameters;
      }

      // Add request body for methods that support it
      if (['POST', 'PUT', 'PATCH'].includes(request.request.method) && request.request.body) {
        const contentType = this.getContentType(request.request.header) || 'application/json';
        
        operation.requestBody = {
          description: 'Request body',
          required: true,
          content: {
            [contentType]: {
              schema: this.generateSchemaFromBody(request.request.body, options.generateSchemas)
            }
          }
        };

        // Add example if available
        if (options.includeExamples && request.request.body.raw) {
          try {
            const example = JSON.parse(request.request.body.raw);
            operation.requestBody.content[contentType].example = example;
          } catch {
            // If not valid JSON, include as string example
            operation.requestBody.content[contentType].example = request.request.body.raw;
          }
        }
      }

      // Add tags if grouping is enabled
      if (options.groupByTags) {
        operation.tags = [this.generateTag(request)];
      }

      return operation;
    } catch (error) {
      warnings.push(`Failed to convert request "${request.name}": ${error}`);
      return null;
    }
  }

  /**
   * Converts Postman request to Swagger 2.0 operation (simplified)
   */
  private static convertRequestToSwaggerOperation(
    request: RequestItem,
    options: OpenAPIExportOptions,
    warnings: string[]
  ): any {
    // Simplified Swagger 2.0 operation conversion
    const operation: any = {
      summary: request.name,
      description: request.request.description,
      responses: {
        '200': {
          description: 'Successful response'
        }
      }
    };

    // Add basic parameter support
    const parameters: any[] = [];

    // Add query parameters
    if (request.request.url && typeof request.request.url === 'object' && request.request.url.query) {
      request.request.url.query.forEach(param => {
        parameters.push({
          name: param.key,
          in: 'query',
          type: 'string',
          description: param.description
        });
      });
    }

    // Add body parameter for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(request.request.method) && request.request.body) {
      parameters.push({
        name: 'body',
        in: 'body',
        description: 'Request body',
        schema: {
          type: 'object'
        }
      });
    }

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    return operation;
  }

  /**
   * Generates operation ID from request
   */
  private static generateOperationId(request: RequestItem): string {
    const method = request.request.method.toLowerCase();
    const name = request.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    return `${method}_${name}`;
  }

  /**
   * Extracts path parameters from URL
   */
  private static extractPathParameters(url: any): string[] {
    const parameters: string[] = [];
    
    let urlString = '';
    if (typeof url === 'string') {
      urlString = url;
    } else if (url && url.raw) {
      urlString = url.raw;
    }

    // Find Postman variables in path
    const matches = urlString.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const paramName = match.replace(/[{}]/g, '');
        if (!parameters.includes(paramName)) {
          parameters.push(paramName);
        }
      });
    }

    return parameters;
  }

  /**
   * Gets content type from headers
   */
  private static getContentType(headers?: Array<{ key: string; value: string }>): string | undefined {
    if (!headers) return undefined;
    
    const contentTypeHeader = headers.find(h => 
      h.key.toLowerCase() === 'content-type'
    );
    
    return contentTypeHeader?.value;
  }

  /**
   * Generates schema from request body
   */
  private static generateSchemaFromBody(body: any, generateSchema: boolean = true): OpenAPISchema {
    if (!generateSchema) {
      return { type: 'object' };
    }

    if (body.mode === 'raw' && body.raw) {
      try {
        const parsed = JSON.parse(body.raw);
        return this.generateSchemaFromObject(parsed);
      } catch {
        return { type: 'string' };
      }
    }

    return { type: 'object' };
  }

  /**
   * Generates JSON schema from object
   */
  private static generateSchemaFromObject(obj: any): OpenAPISchema {
    if (obj === null) {
      return { type: 'null' };
    }

    if (typeof obj === 'string') {
      return { type: 'string' };
    }

    if (typeof obj === 'number') {
      return { type: Number.isInteger(obj) ? 'integer' : 'number' };
    }

    if (typeof obj === 'boolean') {
      return { type: 'boolean' };
    }

    if (Array.isArray(obj)) {
      const schema: OpenAPISchema = { type: 'array' };
      if (obj.length > 0) {
        schema.items = this.generateSchemaFromObject(obj[0]);
      }
      return schema;
    }

    if (typeof obj === 'object') {
      const schema: OpenAPISchema = {
        type: 'object',
        properties: {}
      };

      Object.entries(obj).forEach(([key, value]) => {
        schema.properties![key] = this.generateSchemaFromObject(value);
      });

      return schema;
    }

    return { type: 'object' };
  }

  /**
   * Checks if header is a common HTTP header that shouldn't be included as parameter
   */
  private static isCommonHeader(headerName: string): boolean {
    const commonHeaders = [
      'accept',
      'authorization',
      'content-type',
      'content-length',
      'user-agent',
      'host',
      'connection',
      'cache-control'
    ];
    
    return commonHeaders.includes(headerName.toLowerCase());
  }

  /**
   * Generates tag for request grouping
   */
  private static generateTag(request: RequestItem): string {
    // Extract tag from request name or URL
    const url = typeof request.request.url === 'string' 
      ? request.request.url 
      : request.request.url?.raw || '';
    
    // Try to extract from path
    const pathMatch = url.match(/\/([^\/\?]+)/);
    if (pathMatch) {
      return pathMatch[1].charAt(0).toUpperCase() + pathMatch[1].slice(1);
    }

    // Fallback to method
    return request.request.method;
  }

  /**
   * Converts Postman auth to OpenAPI security scheme
   */
  private static convertPostmanAuthToOpenAPI(auth: RequestAuth): OpenAPISecurityScheme | null {
    switch (auth.type) {
      case 'basic':
        return {
          type: 'http',
          scheme: 'basic'
        };

      case 'bearer':
        return {
          type: 'http',
          scheme: 'bearer'
        };

      case 'apikey':
        const keyParam = auth.apikey?.find(p => p.key === 'key');
        const inParam = auth.apikey?.find(p => p.key === 'in');
        
        return {
          type: 'apiKey',
          name: keyParam?.value || 'X-API-Key',
          in: (inParam?.value as any) || 'header'
        };

      case 'oauth2':
        // Simplified OAuth2
        return {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://example.com/oauth/authorize',
              tokenUrl: 'https://example.com/oauth/token',
              scopes: {}
            }
          }
        };

      default:
        return null;
    }
  }
}