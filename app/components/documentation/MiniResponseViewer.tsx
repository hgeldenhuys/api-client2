import React from 'react';
import { RequestExecution } from '~/types/request';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  ChevronDown,
  ChevronRight,
  Copy
} from 'lucide-react';
import { cn } from '~/utils/cn';
import { JsonHighlighter, CodeHighlighter } from '~/components/ui/syntax-highlighter';

interface MiniResponseViewerProps {
  response: RequestExecution;
  isLoading?: boolean;
}

export function MiniResponseViewer({ response, isLoading }: MiniResponseViewerProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-500';
    if (status >= 300 && status < 400) return 'bg-blue-500';
    if (status >= 400 && status < 500) return 'bg-yellow-500';
    if (status >= 500) return 'bg-red-500';
    return 'bg-gray-500';
  };
  
  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };
  
  const copyResponse = async () => {
    try {
      const text = typeof response.body === 'string' 
        ? response.body 
        : JSON.stringify(response.body, null, 2);
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };
  
  const isJsonResponse = (response: RequestExecution) => {
    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
    return contentType.includes('application/json') || 
           (typeof response.body === 'object' && response.body !== null);
  };
  
  const getPreviewText = () => {
    if (!response.body) return 'No response body';
    
    const text = typeof response.body === 'string' 
      ? response.body 
      : JSON.stringify(response.body, null, 2);
    
    if (text.length <= 200) return text;
    return text.substring(0, 200) + '...';
  };
  
  if (isLoading) {
    return (
      <Card className="mt-4 p-4 bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
          <span className="text-sm text-muted-foreground">Executing request...</span>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="mt-4 bg-muted/30">
      <div className="p-4">
        {/* Response Summary */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getStatusIcon(response.status)}
            <Badge variant="outline" className={cn("text-white", getStatusColor(response.status))}>
              {response.status} {response.statusText}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(response.duration)}
            </div>
            <span className="text-sm text-muted-foreground">
              {formatBytes(response.size)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={copyResponse}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
              {isExpanded ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </div>
        
        {/* Response Preview */}
        <div className="text-sm">
          <div className="font-medium mb-2">Response Preview:</div>
          <div className="bg-background border rounded">
            <CodeHighlighter
              language={isJsonResponse(response) ? 'json' : 'text'}
              showCopyButton={false}
              theme="auto"
              customStyle={{ fontSize: '12px', margin: 0 }}
            >
              {getPreviewText()}
            </CodeHighlighter>
          </div>
        </div>
        
        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Headers */}
            <div>
              <div className="font-medium mb-2 text-sm">Response Headers:</div>
              <div className="bg-background p-3 rounded border">
                {Object.entries(response.headers).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="flex text-xs">
                        <span className="font-mono text-muted-foreground w-1/3">{key}:</span>
                        <span className="font-mono flex-1">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No headers</span>
                )}
              </div>
            </div>
            
            {/* Full Response Body */}
            <div>
              <div className="font-medium mb-2 text-sm">Full Response:</div>
              <div className="bg-background border rounded">
                {isJsonResponse(response) ? (
                  <JsonHighlighter
                    data={response.body}
                    showCopyButton={true}
                    maxHeight="240px"
                    theme="auto"
                  />
                ) : (
                  <CodeHighlighter
                    language="text"
                    showCopyButton={true}
                    theme="auto"
                    customStyle={{ fontSize: '12px', maxHeight: '240px', overflowY: 'auto' }}
                  >
                    {typeof response.body === 'string' ? response.body : String(response.body)}
                  </CodeHighlighter>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {response.error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              <span className="font-medium text-sm">Error:</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{response.error}</p>
          </div>
        )}
      </div>
    </Card>
  );
}