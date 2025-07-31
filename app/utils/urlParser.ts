import { UniversalParameter } from "~/types/postman";
import { generateParameterId } from "./parameterLocations";
import {
  buildVariableAwareQueryString,
  encodeParameterValue,
} from "./variableUtils";

export interface ParsedUrl {
  baseUrl: string;
  queryParams: UniversalParameter[];
  pathVariables: string[];
  isValid: boolean;
  error?: string;
}

/**
 * Parse a URL and extract query parameters and path variables
 */
export function parseUrl(urlString: string): ParsedUrl {
  if (!urlString.trim()) {
    return {
      baseUrl: "",
      queryParams: [],
      pathVariables: [],
      isValid: true,
    };
  }

  try {
    // Handle URLs without protocol
    const normalizedUrl = urlString.startsWith("http")
      ? urlString
      : `https://${urlString}`;

    const url = new URL(normalizedUrl);

    // Extract base URL (without query parameters)
    const baseUrl = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;

    // Extract query parameters
    const queryParams: UniversalParameter[] = [];
    url.searchParams.forEach((value, key) => {
      queryParams.push({
        id: generateParameterId(),
        key,
        value,
        location: "query",
        enabled: true,
        type: "text",
      });
    });

    // Extract path variables (look for {variable} patterns)
    const pathVariables = extractPathVariables(url.pathname);

    return {
      baseUrl: urlString.startsWith("http")
        ? baseUrl
        : baseUrl.replace("https://", ""),
      queryParams,
      pathVariables,
      isValid: true,
    };
  } catch (error) {
    return {
      baseUrl: urlString,
      queryParams: [],
      pathVariables: [],
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid URL format",
    };
  }
}

/**
 * Build URL from base URL and parameters
 */
export function buildUrl(
  baseUrl: string,
  parameters: UniversalParameter[],
): string {
  if (!baseUrl.trim()) {
    return "";
  }

  try {
    // Filter enabled query parameters
    const queryParams = parameters.filter(
      (p) => p.location === "query" && p.enabled && p.key.trim(),
    );

    // Filter enabled path parameters
    const pathParams = parameters.filter(
      (p) => p.location === "path" && p.enabled && p.key.trim(),
    );

    let processedUrl = baseUrl;

    // DON'T replace path variables in the URL - keep them as placeholders
    // Path variables should only be replaced when the request is actually sent
    // This preserves the URL template format (e.g., /users/{{userId}})

    // Add query parameters using variable-aware building
    if (queryParams.length > 0) {
      const queryString = buildVariableAwareQueryString(
        queryParams.map((p) => ({
          key: p.key,
          value: p.value,
          enabled: p.enabled,
        })),
      );

      if (queryString) {
        const separator = processedUrl.includes("?") ? "&" : "?";
        return `${processedUrl}${separator}${queryString}`;
      }
    }

    return processedUrl;
  } catch (error) {
    // If URL building fails, return the base URL
    return baseUrl;
  }
}

/**
 * Extract path variables from URL path
 * Supports both {variable} and {{variable}} syntax
 * e.g., /users/{id}/posts/{postId} or /users/{{userId}}/posts/{{postId}}
 */
export function extractPathVariables(path: string): string[] {
  // Match both {variable} and {{variable}} patterns
  const matches = path.match(/\{\{?([^}]+)\}?\}/g);
  if (!matches) return [];

  return matches.map((match) => {
    // Remove outer braces - handle both {var} and {{var}}
    if (match.startsWith("{{") && match.endsWith("}}")) {
      return match.slice(2, -2);
    } else if (match.startsWith("{") && match.endsWith("}")) {
      return match.slice(1, -1);
    }
    return match;
  });
}

/**
 * Build URL with path variables replaced - for execution only
 * This function replaces path variable placeholders with actual values
 */
export function buildUrlWithReplacedVariables(
  baseUrl: string,
  parameters: UniversalParameter[],
): string {
  if (!baseUrl.trim()) {
    return "";
  }

  try {
    // Filter enabled query parameters
    const queryParams = parameters.filter(
      (p) => p.location === "query" && p.enabled && p.key.trim(),
    );

    // Filter enabled path parameters
    const pathParams = parameters.filter(
      (p) => p.location === "path" && p.enabled && p.key.trim(),
    );

    let processedUrl = baseUrl;

    // Replace path variables - handle both {var} and {{var}} syntax
    pathParams.forEach((param) => {
      // Try to replace both {variable} and {{variable}} patterns
      const singleBracePattern = new RegExp(`\\{${param.key}\\}`, "g");
      const doubleBracePattern = new RegExp(`\\{\\{${param.key}\\}\\}`, "g");
      const encodedValue = encodeParameterValue(param.value);

      processedUrl = processedUrl.replace(doubleBracePattern, encodedValue);
      processedUrl = processedUrl.replace(singleBracePattern, encodedValue);
    });

    // Add query parameters using variable-aware building
    if (queryParams.length > 0) {
      const queryString = buildVariableAwareQueryString(
        queryParams.map((p) => ({
          key: p.key,
          value: p.value,
          enabled: p.enabled,
        })),
      );

      if (queryString) {
        const separator = processedUrl.includes("?") ? "&" : "?";
        return `${processedUrl}${separator}${queryString}`;
      }
    }

    return processedUrl;
  } catch (error) {
    // If URL building fails, return the base URL
    return baseUrl;
  }
}

/**
 * Build query string from parameters (variable-aware)
 */
export function buildQueryString(parameters: UniversalParameter[]): string {
  const queryParams = parameters.filter(
    (p) => p.location === "query" && p.enabled && p.key.trim(),
  );

  return buildVariableAwareQueryString(
    queryParams.map((p) => ({
      key: p.key,
      value: p.value,
      enabled: p.enabled,
    })),
  );
}

/**
 * Parse query string into parameters
 */
export function parseQueryString(queryString: string): UniversalParameter[] {
  if (!queryString.trim()) {
    return [];
  }

  const searchParams = new URLSearchParams(
    queryString.startsWith("?") ? queryString.slice(1) : queryString,
  );
  const parameters: UniversalParameter[] = [];

  searchParams.forEach((value, key) => {
    parameters.push({
      id: generateParameterId(),
      key,
      value,
      location: "query",
      enabled: true,
      type: "text",
    });
  });

  return parameters;
}

/**
 * Extract base URL without query parameters
 */
export function getBaseUrl(urlString: string): string {
  if (!urlString.trim()) {
    return "";
  }

  try {
    const normalizedUrl = urlString.startsWith("http")
      ? urlString
      : `https://${urlString}`;

    const url = new URL(normalizedUrl);
    const baseUrl = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;

    return urlString.startsWith("http")
      ? baseUrl
      : baseUrl.replace("https://", "");
  } catch {
    // If parsing fails, try to remove query string manually
    const questionMarkIndex = urlString.indexOf("?");
    return questionMarkIndex !== -1
      ? urlString.substring(0, questionMarkIndex)
      : urlString;
  }
}

/**
 * Validate URL format
 */
export function isValidUrl(urlString: string): boolean {
  if (!urlString.trim()) {
    return true; // Empty URLs are considered valid
  }

  try {
    const normalizedUrl = urlString.startsWith("http")
      ? urlString
      : `https://${urlString}`;

    new URL(normalizedUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize URL for consistent formatting
 */
export function normalizeUrl(urlString: string): string {
  if (!urlString.trim()) {
    return "";
  }

  try {
    const normalizedUrl = urlString.startsWith("http")
      ? urlString
      : `https://${urlString}`;

    const url = new URL(normalizedUrl);
    const result = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}${url.search}${url.hash}`;

    return urlString.startsWith("http")
      ? result
      : result.replace("https://", "");
  } catch {
    return urlString;
  }
}
