/**
 * Utilities for detecting and handling template variables in parameter values
 */

/**
 * Check if a value is a complete template variable (e.g., "{{token}}")
 */
export const isTemplateVariable = (value: string): boolean => {
  return /^\{\{.+\}\}$/.test(value.trim());
};

/**
 * Check if a value contains any template variables (e.g., "Bearer {{token}}")
 */
export const containsVariables = (value: string): boolean => {
  return /\{\{.+?\}\}/.test(value);
};

/**
 * Extract all template variables from a string
 * Returns array of variable names without the {{}} brackets
 */
export const extractVariables = (value: string): string[] => {
  const matches = value.match(/\{\{([^}]+)\}\}/g);
  return matches ? matches.map((match) => match.slice(2, -2).trim()) : [];
};

/**
 * Check if a parameter key or value should be preserved without encoding
 * This includes template variables and certain special characters
 */
export const shouldPreserveRaw = (value: string): boolean => {
  // Preserve if it contains template variables
  if (containsVariables(value)) {
    return true;
  }

  // Could add other cases here like certain URL patterns, etc.
  return false;
};

/**
 * Safely encode a URL parameter value, preserving template variables
 * Template variables are left as-is, other content is URL encoded
 */
export const encodeParameterValue = (value: string): string => {
  if (!containsVariables(value)) {
    // No variables, safe to encode normally
    return encodeURIComponent(value);
  }

  // Contains variables, need to preserve them
  // Split by variable patterns and encode only the non-variable parts
  const parts: string[] = [];
  let lastIndex = 0;

  const regex = /\{\{[^}]+\}\}/g;
  let match;

  while ((match = regex.exec(value)) !== null) {
    // Add the part before the variable (encoded)
    if (match.index > lastIndex) {
      const beforeVariable = value.slice(lastIndex, match.index);
      if (beforeVariable) {
        parts.push(encodeURIComponent(beforeVariable));
      }
    }

    // Add the variable as-is (not encoded)
    parts.push(match[0]);

    lastIndex = regex.lastIndex;
  }

  // Add any remaining part after the last variable (encoded)
  if (lastIndex < value.length) {
    const afterLastVariable = value.slice(lastIndex);
    if (afterLastVariable) {
      parts.push(encodeURIComponent(afterLastVariable));
    }
  }

  return parts.join("");
};

/**
 * Safely encode a URL parameter key, preserving template variables
 */
export const encodeParameterKey = (key: string): string => {
  // Keys should rarely contain variables, but handle them just in case
  return encodeParameterValue(key);
};

/**
 * Build a query string that preserves template variables
 */
export const buildVariableAwareQueryString = (
  params: Array<{ key: string; value: string; enabled?: boolean }>,
): string => {
  const enabledParams = params.filter((p) => p.enabled !== false);

  if (enabledParams.length === 0) {
    return "";
  }

  const queryParts = enabledParams.map((param) => {
    const encodedKey = encodeParameterKey(param.key);
    const encodedValue = encodeParameterValue(param.value);
    return `${encodedKey}=${encodedValue}`;
  });

  return queryParts.join("&");
};
