import React from 'react';
import { MonacoEditor } from './MonacoEditor';
import { useTheme } from '~/stores/themeStore';

interface ResponseBodyEditorProps {
  body: any;
  contentType?: string;
  height?: string | number;
  theme?: 'vs-dark' | 'vs' | 'hc-black';
}

// Utility to detect language from content-type header
function getLanguageFromContentType(contentType?: string): string {
  if (!contentType) return 'json';
  
  const type = contentType.toLowerCase().split(';')[0].trim();
  
  // Map content types to Monaco languages
  const languageMap: Record<string, string> = {
    'application/json': 'json',
    'text/html': 'html',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'text/css': 'css',
    'application/javascript': 'javascript',
    'text/javascript': 'javascript',
    'text/markdown': 'markdown',
    'text/plain': 'plaintext',
    'application/yaml': 'yaml',
    'text/yaml': 'yaml',
    'application/x-yaml': 'yaml',
  };
  
  // Check exact matches first
  if (languageMap[type]) {
    return languageMap[type];
  }
  
  // Check for partial matches
  if (type.includes('json')) return 'json';
  if (type.includes('xml')) return 'xml';
  if (type.includes('html')) return 'html';
  if (type.includes('javascript')) return 'javascript';
  if (type.includes('css')) return 'css';
  if (type.includes('yaml')) return 'yaml';
  if (type.includes('markdown')) return 'markdown';
  
  // Default to plaintext for unknown types
  return 'plaintext';
}

// Utility to format body content based on type
function formatBody(body: any, language: string): string {
  if (body === null || body === undefined) {
    return '';
  }
  
  // If it's already a string, return as-is
  if (typeof body === 'string') {
    // Try to parse and format JSON strings
    if (language === 'json') {
      try {
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, return original string
        return body;
      }
    }
    return body;
  }
  
  // For objects/arrays, stringify with pretty printing
  if (language === 'json' || typeof body === 'object') {
    try {
      return JSON.stringify(body, null, 2);
    } catch (e) {
      return String(body);
    }
  }
  
  // For other types, convert to string
  return String(body);
}

export function ResponseBodyEditor({ 
  body, 
  contentType, 
  height = '100%',
}: ResponseBodyEditorProps) {
  const language = getLanguageFromContentType(contentType);
  const formattedContent = formatBody(body, language);
  const {theme} = useTheme();
  return (
    <MonacoEditor
      value={formattedContent}
      language={language}
      height={height}
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      readOnly={true}
      minimap={false}
    />
  );
}