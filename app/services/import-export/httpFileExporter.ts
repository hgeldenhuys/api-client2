import type { PostmanCollection, RequestItem, FolderItem } from '~/types/postman';
import type { 
  HTTPFile, 
  HTTPRequest, 
  HTTPFileExportOptions,
  HTTPFileFormatOptions,
  HTTPVariable,
  HTTPEnvironment
} from '~/types/http';

export class HTTPFileExporter {
  /**
   * Exports a Postman collection as HTTP file content
   */
  static export(
    collection: PostmanCollection,
    options: HTTPFileExportOptions = {}
  ): string {
    const {
      includeComments = true,
      includeVariables = true,
      includeMetadata = true,
      formatBody = true,
      indentSize = 2,
      lineEnding = 'lf',
      includeRequestNames = true,
      groupByTags = false,
      variableFormat = 'inline'
    } = options;

    const lines: string[] = [];
    const lineEnd = lineEnding === 'crlf' ? '\r\n' : lineEnding === 'cr' ? '\r' : '\n';

    // Add file header comment
    if (includeComments && includeMetadata) {
      lines.push('###');
      lines.push(`# ${collection.info.name}`);
      if (collection.info.description) {
        lines.push(`# ${collection.info.description}`);
      }
      lines.push(`# Generated from Postman Collection`);
      lines.push(`# Export Date: ${new Date().toISOString()}`);
      lines.push('###');
      lines.push('');
    }

    // Add variables section
    if (includeVariables && collection.variable && collection.variable.length > 0) {
      if (includeComments) {
        lines.push('# Variables');
      }
      
      collection.variable.forEach(variable => {
        if (variableFormat === 'inline' || variableFormat === 'both') {
          lines.push(`# @${variable.key} = ${variable.value}`);
        }
      });
      
      lines.push('');
    }

    // Convert requests
    const requests = this.flattenRequests(collection.item);
    
    if (groupByTags) {
      const grouped = this.groupRequestsByTag(requests);
      Object.entries(grouped).forEach(([tag, tagRequests], groupIndex) => {
        if (groupIndex > 0) lines.push('');
        
        if (includeComments) {
          lines.push(`### ${tag} ###`);
          lines.push('');
        }

        tagRequests.forEach((request, index) => {
          if (index > 0) lines.push('');
          this.exportRequest(request, lines, options);
        });
      });
    } else {
      requests.forEach((request, index) => {
        if (index > 0) lines.push('');
        this.exportRequest(request, lines, options);
      });
    }

    return lines.join(lineEnd);
  }

  /**
   * Exports to file download
   */
  static async exportToFile(
    collection: PostmanCollection,
    options: HTTPFileExportOptions = {}
  ): Promise<void> {
    const content = this.export(collection, options);
    const filename = `${collection.info.name.replace(/[^a-z0-9]/gi, '_')}.http`;
    
    const blob = new Blob([content], { type: 'text/plain' });
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
   * Exports multiple collections as separate files
   */
  static async exportMultipleToFiles(
    collections: PostmanCollection[],
    options: HTTPFileExportOptions = {}
  ): Promise<void> {
    // Create a zip-like download with multiple files
    // For now, we'll export them sequentially
    for (const collection of collections) {
      await this.exportToFile(collection, options);
    }
  }

  /**
   * Converts Postman collection to HTTP file format
   */
  static convertToHTTPFile(collection: PostmanCollection): HTTPFile {
    const requests = this.flattenRequests(collection.item).map(item => 
      this.convertPostmanRequestToHTTP(item)
    );

    const variables: Record<string, string> = {};
    if (collection.variable) {
      collection.variable.forEach(variable => {
        variables[variable.key] = variable.value;
      });
    }

    return {
      requests,
      variables: Object.keys(variables).length > 0 ? variables : undefined,
      metadata: {
        filename: `${collection.info.name}.http`,
        description: collection.info.description,
        created: new Date().toISOString()
      }
    };
  }

  /**
   * Flattens nested request structure
   */
  private static flattenRequests(items: (RequestItem | FolderItem)[]): RequestItem[] {
    const requests: RequestItem[] = [];

    const processItems = (items: (RequestItem | FolderItem)[]) => {
      items.forEach(item => {
        if ('item' in item && Array.isArray(item.item)) {
          // It's a folder, process recursively
          processItems(item.item);
        } else if ('request' in item) {
          // It's a request
          requests.push(item);
        }
      });
    };

    processItems(items);
    return requests;
  }

  /**
   * Groups requests by tags (extracted from names or folders)
   */
  private static groupRequestsByTag(requests: RequestItem[]): Record<string, RequestItem[]> {
    const groups: Record<string, RequestItem[]> = {};

    requests.forEach(request => {
      const tag = this.extractTag(request);
      
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(request);
    });

    return groups;
  }

  /**
   * Extracts tag from request (simplified)
   */
  private static extractTag(request: RequestItem): string {
    // Try to extract from URL path
    const url = typeof request.request.url === 'string' 
      ? request.request.url 
      : request.request.url?.raw || '';
    
    const pathMatch = url.match(/\/([^\/\?\{]+)/);
    if (pathMatch) {
      return pathMatch[1].charAt(0).toUpperCase() + pathMatch[1].slice(1);
    }

    // Fallback to method
    return request.request.method;
  }

  /**
   * Exports a single request to HTTP format
   */
  private static exportRequest(
    request: RequestItem,
    lines: string[],
    options: HTTPFileExportOptions
  ): void {
    const {
      includeComments = true,
      includeRequestNames = true,
      formatBody = true,
      indentSize = 2
    } = options;

    // Add request separator and name
    if (includeRequestNames && request.name) {
      lines.push(`### ${request.name}`);
    } else {
      lines.push('###');
    }

    // Add request description as comment
    if (includeComments && request.request.description) {
      lines.push(`# ${request.request.description}`);
      lines.push('');
    }

    // Build request line
    const url = typeof request.request.url === 'string' 
      ? request.request.url 
      : request.request.url?.raw || '';
    
    lines.push(`${request.request.method} ${url}`);

    // Add headers
    if (request.request.header && request.request.header.length > 0) {
      request.request.header.forEach(header => {
        if (!header.disabled) {
          lines.push(`${header.key}: ${header.value}`);
        }
      });
    }

    // Add body
    if (request.request.body && request.request.body.raw) {
      lines.push(''); // Empty line before body
      
      const body = request.request.body.raw;
      
      if (formatBody && this.isJSON(body)) {
        // Format JSON body
        try {
          const parsed = JSON.parse(body);
          const formatted = JSON.stringify(parsed, null, indentSize);
          lines.push(formatted);
        } catch {
          // If JSON parsing fails, use raw body
          lines.push(body);
        }
      } else {
        lines.push(body);
      }
    }
  }

  /**
   * Converts Postman request to HTTP request format
   */
  private static convertPostmanRequestToHTTP(request: RequestItem): HTTPRequest {
    const url = typeof request.request.url === 'string' 
      ? request.request.url 
      : request.request.url?.raw || '';

    const httpRequest: HTTPRequest = {
      id: request.id,
      name: request.name,
      description: request.request.description,
      method: request.request.method,
      url,
      headers: request.request.header?.map(header => ({
        name: header.key,
        value: header.value,
        enabled: !header.disabled,
        description: header.description
      }))
    };

    // Add body
    if (request.request.body && request.request.body.raw) {
      httpRequest.body = {
        type: this.detectBodyType(request.request.body.raw, request.request.header),
        content: request.request.body.raw,
        contentType: this.getContentType(request.request.header)
      };
    }

    return httpRequest;
  }

  /**
   * Detects body content type
   */
  private static detectBodyType(content: string, headers?: Array<{ key: string; value: string }>): NonNullable<HTTPRequest['body']>['type'] {
    // Check content-type header first
    const contentType = this.getContentType(headers);
    
    if (contentType) {
      if (contentType.includes('json')) return 'json';
      if (contentType.includes('xml')) return 'xml';
      if (contentType.includes('html')) return 'html';
      if (contentType.includes('javascript')) return 'javascript';
      if (contentType.includes('form-data')) return 'form-data';
      if (contentType.includes('x-www-form-urlencoded')) return 'form-urlencoded';
      if (contentType.includes('graphql')) return 'graphql';
    }

    // Try to detect from content
    const trimmed = content.trim();
    
    if (this.isJSON(trimmed)) return 'json';
    if (trimmed.startsWith('<')) return 'xml';
    if (trimmed.includes('query') && trimmed.includes('{')) return 'graphql';
    
    return 'text';
  }

  /**
   * Gets content-type from headers
   */
  private static getContentType(headers?: Array<{ key: string; value: string }>): string | undefined {
    if (!headers) return undefined;
    
    const contentTypeHeader = headers.find(h => 
      h.key.toLowerCase() === 'content-type'
    );
    
    return contentTypeHeader?.value;
  }

  /**
   * Checks if content is valid JSON
   */
  private static isJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Formats HTTP file with specific formatting options
   */
  static formatHTTPFile(content: string, options: HTTPFileFormatOptions): string {
    const {
      indentSize = 2,
      useSpaces = true,
      maxLineLength,
      sortHeaders = false,
      normalizeHeaderNames = false,
      preserveComments = true,
      addBlankLines = true,
      headerCase = 'original'
    } = options;

    const lines = content.split(/\r?\n/);
    const formattedLines: string[] = [];
    let inBody = false;
    let currentHeaders: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines in certain contexts
      if (!trimmed) {
        if (addBlankLines || inBody) {
          formattedLines.push('');
        }
        continue;
      }

      // Handle comments
      if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
        if (preserveComments) {
          formattedLines.push(line);
        }
        continue;
      }

      // Handle request separators
      if (trimmed.startsWith('###')) {
        if (i > 0 && addBlankLines) {
          formattedLines.push('');
        }
        formattedLines.push(line);
        inBody = false;
        currentHeaders = [];
        continue;
      }

      // Handle request lines
      if (this.isHTTPRequestLine(trimmed)) {
        formattedLines.push(line);
        inBody = false;
        currentHeaders = [];
        continue;
      }

      // Handle headers
      if (!inBody && line.includes(':') && !line.startsWith('http')) {
        let headerLine = line;
        
        if (normalizeHeaderNames) {
          const colonIndex = line.indexOf(':');
          const headerName = line.substring(0, colonIndex).trim();
          const headerValue = line.substring(colonIndex + 1).trim();
          
          const normalizedName = this.normalizeHeaderName(headerName, headerCase);
          headerLine = `${normalizedName}: ${headerValue}`;
        }
        
        currentHeaders.push(headerLine);
        continue;
      }

      // Start of body
      if (currentHeaders.length > 0 && !inBody) {
        // Sort headers if requested
        if (sortHeaders) {
          currentHeaders.sort((a, b) => {
            const aName = a.substring(0, a.indexOf(':')).toLowerCase();
            const bName = b.substring(0, b.indexOf(':')).toLowerCase();
            return aName.localeCompare(bName);
          });
        }
        
        formattedLines.push(...currentHeaders);
        
        if (addBlankLines) {
          formattedLines.push('');
        }
        
        currentHeaders = [];
        inBody = true;
      }

      // Handle body content
      if (inBody) {
        // Try to format JSON
        if (this.isJSON(trimmed)) {
          try {
            const parsed = JSON.parse(trimmed);
            const indent = useSpaces ? ' '.repeat(indentSize) : '\t';
            const formatted = JSON.stringify(parsed, null, indent);
            formattedLines.push(formatted);
          } catch {
            formattedLines.push(line);
          }
        } else {
          formattedLines.push(line);
        }
      } else {
        formattedLines.push(line);
      }
    }

    // Add remaining headers if any
    if (currentHeaders.length > 0) {
      if (sortHeaders) {
        currentHeaders.sort();
      }
      formattedLines.push(...currentHeaders);
    }

    return formattedLines.join('\n');
  }

  /**
   * Normalizes header name case
   */
  private static normalizeHeaderName(name: string, caseStyle: HTTPFileFormatOptions['headerCase']): string {
    switch (caseStyle) {
      case 'lowercase':
        return name.toLowerCase();
      case 'uppercase':
        return name.toUpperCase();
      case 'titlecase':
        return name.split('-').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('-');
      default:
        return name;
    }
  }

  /**
   * Checks if line is an HTTP request line
   */
  private static isHTTPRequestLine(line: string): boolean {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];
    const parts = line.split(/\s+/);
    return parts.length >= 2 && methods.includes(parts[0]);
  }

  /**
   * Creates environment file content from variables
   */
  static createEnvironmentFile(
    variables: Record<string, HTTPVariable>,
    environmentName: string = 'default'
  ): string {
    const lines: string[] = [];
    
    lines.push(`# Environment: ${environmentName}`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push('');

    Object.entries(variables).forEach(([key, variable]) => {
      if (variable.description) {
        lines.push(`# ${variable.description}`);
      }
      
      if (variable.sensitive) {
        lines.push(`# ${key} = <sensitive-value>`);
      } else {
        lines.push(`${key} = ${variable.value}`);
      }
      
      lines.push('');
    });

    return lines.join('\n');
  }
}