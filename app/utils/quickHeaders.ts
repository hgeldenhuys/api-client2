/**
 * Common HTTP headers with descriptions for quick selection
 */

export interface QuickHeaderOption {
  key: string;
  value: string;
  description: string;
  category: string;
}

export interface QuickHeaderCategory {
  name: string;
  description: string;
  headers: QuickHeaderOption[];
}

export const QUICK_HEADERS: QuickHeaderCategory[] = [
  {
    name: "Content Type",
    description: "Specify the media type of the request/response body",
    headers: [
      {
        key: "Content-Type",
        value: "application/json",
        description: "JSON data",
        category: "Content Type",
      },
      {
        key: "Content-Type",
        value: "application/xml",
        description: "XML data",
        category: "Content Type",
      },
      {
        key: "Content-Type",
        value: "text/html",
        description: "HTML content",
        category: "Content Type",
      },
      {
        key: "Content-Type",
        value: "text/plain",
        description: "Plain text",
        category: "Content Type",
      },
      {
        key: "Content-Type",
        value: "multipart/form-data",
        description: "File uploads and form data",
        category: "Content Type",
      },
      {
        key: "Content-Type",
        value: "application/x-www-form-urlencoded",
        description: "URL-encoded form data",
        category: "Content Type",
      },
    ],
  },
  {
    name: "Authentication",
    description: "Authentication and authorization headers",
    headers: [
      {
        key: "Authorization",
        value: "Bearer {{token}}",
        description: "Bearer token authentication",
        category: "Authentication",
      },
      {
        key: "Authorization",
        value: "Basic {{credentials}}",
        description: "Basic authentication (base64 encoded)",
        category: "Authentication",
      },
      {
        key: "Authorization",
        value: "Digest {{digest}}",
        description: "Digest authentication",
        category: "Authentication",
      },
      {
        key: "X-API-Key",
        value: "{{api_key}}",
        description: "API key authentication",
        category: "Authentication",
      },
      {
        key: "X-Auth-Token",
        value: "{{auth_token}}",
        description: "Custom auth token",
        category: "Authentication",
      },
    ],
  },
  {
    name: "Accept",
    description: "Specify acceptable response formats",
    headers: [
      {
        key: "Accept",
        value: "application/json",
        description: "Expect JSON response",
        category: "Accept",
      },
      {
        key: "Accept",
        value: "application/xml",
        description: "Expect XML response",
        category: "Accept",
      },
      {
        key: "Accept",
        value: "text/html",
        description: "Expect HTML response",
        category: "Accept",
      },
      {
        key: "Accept",
        value: "*/*",
        description: "Accept any content type",
        category: "Accept",
      },
      {
        key: "Accept-Encoding",
        value: "gzip, deflate, br",
        description: "Accept compressed responses",
        category: "Accept",
      },
      {
        key: "Accept-Language",
        value: "en-US,en;q=0.9",
        description: "Preferred response language",
        category: "Accept",
      },
    ],
  },
  {
    name: "User Agent",
    description: "Identify the client making the request",
    headers: [
      {
        key: "User-Agent",
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        description: "Chrome on Windows",
        category: "User Agent",
      },
      {
        key: "User-Agent",
        value:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        description: "Chrome on macOS",
        category: "User Agent",
      },
      {
        key: "User-Agent",
        value: "API Client/1.0",
        description: "Simple API client identifier",
        category: "User Agent",
      },
      {
        key: "User-Agent",
        value: "{{user_agent}}",
        description: "Custom user agent variable",
        category: "User Agent",
      },
    ],
  },
  {
    name: "Cache Control",
    description: "Control caching behavior",
    headers: [
      {
        key: "Cache-Control",
        value: "no-cache",
        description: "Don't use cached responses",
        category: "Cache Control",
      },
      {
        key: "Cache-Control",
        value: "max-age=3600",
        description: "Cache for 1 hour",
        category: "Cache Control",
      },
      {
        key: "If-None-Match",
        value: "{{etag}}",
        description: "Conditional request with ETag",
        category: "Cache Control",
      },
    ],
  },
  {
    name: "CORS",
    description: "Cross-Origin Resource Sharing headers",
    headers: [
      {
        key: "Origin",
        value: "{{origin}}",
        description: "Request origin for CORS",
        category: "CORS",
      },
      {
        key: "Access-Control-Request-Method",
        value: "POST",
        description: "Preflight request method",
        category: "CORS",
      },
      {
        key: "Access-Control-Request-Headers",
        value: "Content-Type, Authorization",
        description: "Preflight request headers",
        category: "CORS",
      },
    ],
  },
  {
    name: "Custom Headers",
    description: "Commonly used custom headers",
    headers: [
      {
        key: "X-Request-ID",
        value: "{{request_id}}",
        description: "Unique request identifier",
        category: "Custom Headers",
      },
      {
        key: "X-Forwarded-For",
        value: "{{client_ip}}",
        description: "Original client IP address",
        category: "Custom Headers",
      },
      {
        key: "X-Custom-Header",
        value: "{{custom_value}}",
        description: "Custom header template",
        category: "Custom Headers",
      },
    ],
  },
];

/**
 * Get all quick header options as a flat array
 */
export function getAllQuickHeaders(): QuickHeaderOption[] {
  return QUICK_HEADERS.flatMap((category) => category.headers);
}

/**
 * Search quick headers by key or description
 */
export function searchQuickHeaders(query: string): QuickHeaderOption[] {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return getAllQuickHeaders();
  }

  return getAllQuickHeaders().filter(
    (header) =>
      header.key.toLowerCase().includes(lowerQuery) ||
      header.description.toLowerCase().includes(lowerQuery) ||
      header.value.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Get quick headers by category
 */
export function getQuickHeadersByCategory(
  categoryName: string,
): QuickHeaderOption[] {
  const category = QUICK_HEADERS.find((cat) => cat.name === categoryName);
  return category ? category.headers : [];
}
