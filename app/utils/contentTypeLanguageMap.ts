/**
 * Mapping between Content-Type headers and Monaco Editor language identifiers
 */

export interface LanguageOption {
  id: string;
  label: string;
  monacoLanguage: string;
  contentTypes: string[];
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: 'json',
    label: 'JSON',
    monacoLanguage: 'json',
    contentTypes: ['application/json', 'application/ld+json', 'application/vnd.api+json']
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    monacoLanguage: 'javascript',
    contentTypes: ['application/javascript', 'text/javascript', 'application/x-javascript']
  },
  {
    id: 'xml',
    label: 'XML',
    monacoLanguage: 'xml',
    contentTypes: ['application/xml', 'text/xml', 'application/xhtml+xml', 'application/soap+xml']
  },
  {
    id: 'html',
    label: 'HTML',
    monacoLanguage: 'html',
    contentTypes: ['text/html']
  },
  {
    id: 'css',
    label: 'CSS',
    monacoLanguage: 'css',
    contentTypes: ['text/css']
  },
  {
    id: 'yaml',
    label: 'YAML',
    monacoLanguage: 'yaml',
    contentTypes: ['application/x-yaml', 'text/yaml', 'text/x-yaml', 'application/yaml']
  },
  {
    id: 'graphql',
    label: 'GraphQL',
    monacoLanguage: 'graphql',
    contentTypes: ['application/graphql']
  },
  {
    id: 'plaintext',
    label: 'Plain Text',
    monacoLanguage: 'plaintext',
    contentTypes: ['text/plain']
  },
  {
    id: 'markdown',
    label: 'Markdown',
    monacoLanguage: 'markdown',
    contentTypes: ['text/markdown', 'text/x-markdown']
  },
  {
    id: 'sql',
    label: 'SQL',
    monacoLanguage: 'sql',
    contentTypes: ['application/sql']
  },
  {
    id: 'shell',
    label: 'Shell',
    monacoLanguage: 'shell',
    contentTypes: ['application/x-sh', 'text/x-shellscript']
  }
];

/**
 * Get Monaco language identifier from Content-Type header
 */
export function getLanguageFromContentType(contentType: string | undefined): string {
  if (!contentType) {
    return 'json'; // Default to JSON
  }

  // Extract the base content type (before any parameters like charset)
  const baseContentType = contentType.split(';')[0].trim().toLowerCase();

  // Find matching language option
  const languageOption = LANGUAGE_OPTIONS.find(option =>
    option.contentTypes.some(ct => ct.toLowerCase() === baseContentType)
  );

  return languageOption?.monacoLanguage || 'json'; // Default to JSON if no match
}

/**
 * Get primary Content-Type for a given language
 */
export function getContentTypeFromLanguage(languageId: string): string {
  const languageOption = LANGUAGE_OPTIONS.find(
    option => option.id === languageId || option.monacoLanguage === languageId
  );

  if (languageOption && languageOption.contentTypes.length > 0) {
    return languageOption.contentTypes[0];
  }

  // Default content type
  return 'application/json';
}

/**
 * Check if a Content-Type is text-based and suitable for Monaco editor
 */
export function isTextBasedContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    return true; // Assume text-based if not specified
  }

  const baseContentType = contentType.split(';')[0].trim().toLowerCase();

  // Check if it matches any of our known text-based types
  const isKnownTextType = LANGUAGE_OPTIONS.some(option =>
    option.contentTypes.some(ct => ct.toLowerCase() === baseContentType)
  );

  if (isKnownTextType) {
    return true;
  }

  // Check common text-based patterns
  return (
    baseContentType.startsWith('text/') ||
    baseContentType.includes('json') ||
    baseContentType.includes('xml') ||
    baseContentType.includes('javascript') ||
    baseContentType.includes('yaml') ||
    baseContentType.includes('+json') ||
    baseContentType.includes('+xml')
  );
}

/**
 * Get language option by ID
 */
export function getLanguageOption(languageId: string): LanguageOption | undefined {
  return LANGUAGE_OPTIONS.find(
    option => option.id === languageId || option.monacoLanguage === languageId
  );
}