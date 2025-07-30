import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import tomorrow from 'react-syntax-highlighter/dist/esm/styles/prism/tomorrow';
import prism from 'react-syntax-highlighter/dist/esm/styles/prism/prism';
import { Button } from '~/components/ui/button';
import { Copy } from 'lucide-react';
import { cn } from '~/utils/cn';

// Note: react-syntax-highlighter includes common languages by default
// We'll rely on the built-in language support

interface CodeHighlighterProps {
  children: string;
  language?: string;
  className?: string;
  showCopyButton?: boolean;
  customStyle?: React.CSSProperties;
  showLineNumbers?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export function CodeHighlighter({
  children,
  language = 'text',
  className,
  showCopyButton = true,
  customStyle,
  showLineNumbers = false,
  theme = 'auto'
}: CodeHighlighterProps) {
  const [copied, setCopied] = React.useState(false);
  
  // Determine theme based on prop or system preference
  const resolvedTheme = React.useMemo(() => {
    if (theme !== 'auto') return theme;
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    return 'dark'; // Default to dark
  }, [theme]);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };
  
  // Map common language aliases
  const normalizeLanguage = (lang: string) => {
    const languageMap: Record<string, string> = {
      'http': 'http',
      'js': 'javascript',
      'javascript': 'javascript',
      'ts': 'typescript',
      'typescript': 'typescript',
      'json': 'json',
      'html': 'markup',
      'xml': 'markup',
      'css': 'css',
      'bash': 'bash',
      'shell': 'bash',
      'text': 'text',
      'plain': 'text'
    };
    
    return languageMap[lang.toLowerCase()] || 'text';
  };
  
  const normalizedLanguage = normalizeLanguage(language);
  
  // Debug logging for language detection
  if (process.env.NODE_ENV === 'development') {
    console.log(`CodeHighlighter: original="${language}", normalized="${normalizedLanguage}", content preview="${children.substring(0, 50)}..."`);
  }
  
  // Custom style that respects the theme and integrates with our design system
  const getCustomStyle = () => {
    const baseStyle: React.CSSProperties = {
      margin: 0,
      borderRadius: '6px',
      fontSize: '13px',
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      ...customStyle
    };
    
    return baseStyle;
  };
  
  return (
    <div className={cn("relative group", className)}>
      <SyntaxHighlighter
        language={normalizedLanguage}
        style={resolvedTheme === 'dark' ? tomorrow : prism}
        customStyle={getCustomStyle()}
        showLineNumbers={showLineNumbers}
        wrapLines={true}
        wrapLongLines={true}
      >
        {children}
      </SyntaxHighlighter>
      
      {showCopyButton && (
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={copyToClipboard}
        >
          <Copy className="h-4 w-4" />
          {copied && <span className="ml-1 text-xs">Copied!</span>}
        </Button>
      )}
    </div>
  );
}

// Inline code component for use in markdown
interface InlineCodeProps {
  children: string;
  className?: string;
}

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code className={cn(
      "px-1.5 py-0.5 bg-muted rounded text-sm font-mono",
      "border border-border/50",
      className
    )}>
      {children}
    </code>
  );
}

// HTTP request specific highlighter
interface HttpRequestHighlighterProps {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  showCopyButton?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export function HttpRequestHighlighter({
  method,
  url,
  headers,
  body,
  showCopyButton = true,
  theme = 'auto'
}: HttpRequestHighlighterProps) {
  const httpRequest = React.useMemo(() => {
    let request = `${method.toUpperCase()} ${url}`;
    
    if (headers && Object.keys(headers).length > 0) {
      request += '\n' + Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
    
    if (body) {
      request += '\n\n' + body;
    }
    
    return request;
  }, [method, url, headers, body]);
  
  return (
    <CodeHighlighter
      language="http"
      showCopyButton={showCopyButton}
      theme={theme}
    >
      {httpRequest}
    </CodeHighlighter>
  );
}

// JSON response highlighter
interface JsonHighlighterProps {
  data: any;
  showCopyButton?: boolean;
  maxHeight?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export function JsonHighlighter({
  data,
  showCopyButton = true,
  maxHeight,
  theme = 'auto'
}: JsonHighlighterProps) {
  const jsonString = React.useMemo(() => {
    try {
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    } catch (err) {
      return String(data);
    }
  }, [data]);
  
  const customStyle = maxHeight ? { maxHeight, overflowY: 'auto' as const } : undefined;
  
  return (
    <CodeHighlighter
      language="json"
      showCopyButton={showCopyButton}
      customStyle={customStyle}
      theme={theme}
    >
      {jsonString}
    </CodeHighlighter>
  );
}