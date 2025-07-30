import { ParameterLocation, ParameterLocationInfo, UniversalParameter } from '~/types/postman';

export const PARAMETER_LOCATIONS: Record<ParameterLocation, ParameterLocationInfo> = {
  query: {
    location: 'query',
    label: 'Query Params',
    icon: '🔗',
    description: 'Added to URL as query string (?key=value)',
    supportsFiles: false,
    validationRules: {
      allowSpaces: true,
      maxLength: 2048
    }
  },
  header: {
    location: 'header',
    label: 'Headers',
    icon: '📋',
    description: 'Added to HTTP request headers',
    supportsFiles: false,
    validationRules: {
      keyPattern: /^[a-zA-Z0-9\-_]+$/,
      allowSpaces: false,
      maxLength: 8192
    }
  },
  'form-data': {
    location: 'form-data',
    label: 'Form Data',
    icon: '📄',
    description: 'Sent as multipart/form-data in request body',
    supportsFiles: true,
    validationRules: {
      allowSpaces: true
    }
  },
  urlencoded: {
    location: 'urlencoded',
    label: 'URL Encoded',
    icon: '🔒',
    description: 'Sent as application/x-www-form-urlencoded in body',
    supportsFiles: false,
    validationRules: {
      allowSpaces: true
    }
  },
  path: {
    location: 'path',
    label: 'Path Variables',
    icon: '🛤️',
    description: 'Replace path variables in URL (e.g., {id})',
    supportsFiles: false,
    validationRules: {
      keyPattern: /^[a-zA-Z0-9_]+$/,
      allowSpaces: false
    }
  }
};

/**
 * Auto-suggest parameter location based on key name patterns
 */
export function suggestParameterLocation(key: string): ParameterLocation {
  const lowerKey = key.toLowerCase();
  
  // Header suggestions
  const headerPatterns = [
    'authorization', 'auth', 'token', 'api-key', 'api_key', 'apikey',
    'content-type', 'accept', 'user-agent', 'referer', 'origin',
    'x-', 'bearer', 'basic', 'cookie', 'session'
  ];
  
  // Query parameter suggestions  
  const queryPatterns = [
    'search', 'q', 'query', 'filter', 'sort', 'page', 'limit', 'offset',
    'size', 'count', 'id', 'category', 'type', 'status', 'date', 'from', 'to'
  ];
  
  // Form data suggestions
  const formPatterns = [
    'username', 'password', 'email', 'name', 'phone', 'address',
    'message', 'comment', 'description', 'file', 'upload', 'image'
  ];
  
  // Check for exact matches or patterns
  for (const pattern of headerPatterns) {
    if (lowerKey.includes(pattern)) {
      return 'header';
    }
  }
  
  for (const pattern of queryPatterns) {
    if (lowerKey.includes(pattern)) {
      return 'query';
    }
  }
  
  for (const pattern of formPatterns) {
    if (lowerKey.includes(pattern)) {
      return 'form-data';
    }
  }
  
  // Default to query for unknown parameters
  return 'query';
}

/**
 * Validate parameter based on its location rules
 */
export function validateParameter(param: UniversalParameter): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const locationInfo = PARAMETER_LOCATIONS[param.location];
  const rules = locationInfo.validationRules;
  
  // Validate key
  if (!param.key.trim()) {
    errors.push('Parameter key cannot be empty');
  }
  
  if (rules.keyPattern && !rules.keyPattern.test(param.key)) {
    errors.push(`Invalid key format for ${locationInfo.label}`);
  }
  
  if (!rules.allowSpaces && param.key.includes(' ')) {
    errors.push(`Spaces not allowed in ${locationInfo.label} keys`);
  }
  
  if (rules.maxLength && param.key.length > rules.maxLength) {
    errors.push(`Key too long for ${locationInfo.label} (max ${rules.maxLength})`);
  }
  
  // Validate value
  if (rules.maxLength && param.value.length > rules.maxLength) {
    errors.push(`Value too long for ${locationInfo.label} (max ${rules.maxLength})`);
  }
  
  // File type validation
  if (param.type === 'file' && !locationInfo.supportsFiles) {
    errors.push(`File uploads not supported for ${locationInfo.label}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate unique ID for parameters
 */
export function generateParameterId(): string {
  return `param-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new universal parameter with smart defaults
 */
export function createUniversalParameter(
  key: string = '',
  value: string = '',
  location?: ParameterLocation
): UniversalParameter {
  return {
    id: generateParameterId(),
    key,
    value,
    location: location || suggestParameterLocation(key),
    enabled: true,
    type: 'text'
  };
}

/**
 * Convert legacy parameters to universal parameters
 */
export function convertToUniversalParameters(
  params: Array<{ key: string; value: string; enabled?: boolean; disabled?: boolean }>,
  location: ParameterLocation
): UniversalParameter[] {
  return params.map(param => ({
    id: generateParameterId(),
    key: param.key,
    value: param.value,
    location,
    enabled: param.enabled ?? !param.disabled ?? true,
    type: 'text' as const
  }));
}

/**
 * Group parameters by location
 */
export function groupParametersByLocation(
  parameters: UniversalParameter[]
): Record<ParameterLocation, UniversalParameter[]> {
  const grouped = {} as Record<ParameterLocation, UniversalParameter[]>;
  
  // Initialize all locations with empty arrays
  Object.keys(PARAMETER_LOCATIONS).forEach(location => {
    grouped[location as ParameterLocation] = [];
  });
  
  // Group parameters
  parameters.forEach(param => {
    if (!grouped[param.location]) {
      grouped[param.location] = [];
    }
    grouped[param.location].push(param);
  });
  
  return grouped;
}