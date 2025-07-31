import React, { useState } from 'react';
import { useCollectionStore } from '~/stores/collectionStore';
import { useRequestStore } from '~/stores/requestStore';
import { useEnvironmentStore } from '~/stores/environmentStore';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Label } from '~/components/ui/label';
import { Send, X, Square, Copy, Code } from 'lucide-react';
import { HttpMethod } from '~/types/postman';
import { SplitButton } from '~/components/ui/split-button';
import { codeGenerators } from '~/utils/codeGenerators';
import { ScriptExamplesDropdown } from '~/components/ScriptExamplesDropdown';
import { UniversalParametersEditor } from '~/components/UniversalParametersEditor';
import { useUniversalParameters } from '~/hooks/useUniversalParameters';
import { buildUrlWithReplacedVariables } from '~/utils/urlParser';
import { groupParametersByLocation } from '~/utils/parameterLocations';
import { UrlVariableInput } from '~/components/UrlVariableInput';
import { AddVariableDialog } from '~/components/AddVariableDialog';
import { useVariableContext } from '~/hooks/useVariableContext';
import { useTheme } from '~/stores/themeStore';
import { AuthenticationEditor } from '~/components/AuthenticationEditor';
import { useContentTypeSync } from '~/hooks/useContentTypeSync';
import { LANGUAGE_OPTIONS } from '~/utils/contentTypeLanguageMap';

const MonacoEditor = React.lazy(() => 
  import('./MonacoEditor').then(module => ({ default: module.MonacoEditor }))
);

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// Debounce function
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return React.useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

export function RequestBuilder() {
  const { 
    activeCollectionId, 
    activeRequestId,
    openTabs,
    closeTab,
    findRequestById,
    updateRequest,
    collections 
  } = useCollectionStore();
  
  const {
    isLoading,
    executeRequest,
    abortRequest,
    setActiveRequest
  } = useRequestStore();
  
  const { replaceVariables, resolveAllVariables } = useEnvironmentStore();
  const { variables } = useVariableContext();
  
  const [method, setMethod] = React.useState<HttpMethod>('GET');
  const [url, setUrl] = React.useState('');
  const [urlInputValue, setUrlInputValue] = React.useState(''); // Separate state for input to prevent infinite parsing
  const [bodyContent, setBodyContent] = React.useState('');
  const [bodyMode, setBodyMode] = React.useState<'none' | 'raw' | 'form-data' | 'x-www-form-urlencoded'>('none');
  const [preRequestScript, setPreRequestScript] = React.useState('');
  const [testScript, setTestScript] = React.useState('');
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [showAddVariableDialog, setShowAddVariableDialog] = useState(false);
  const [variableToAdd, setVariableToAdd] = useState('');
  
  // Track when URL is being updated from user input to prevent overwriting
  const isUpdatingFromUserInput = React.useRef(false);

  // Get the current theme from the environment store
  const {theme} = useTheme();
  
  // Function to sync URL input value to actual URL (only on blur/enter)
  const syncUrlFromInput = React.useCallback(() => {
    if (urlInputValue !== url) {
      isUpdatingFromUserInput.current = true;
      setUrl(urlInputValue);
      // Reset flag after state update
      setTimeout(() => {
        isUpdatingFromUserInput.current = false;
      }, 0);
    }
  }, [urlInputValue, url]);
  
  // Universal parameters using custom hook to isolate state management
  const {
    parameters,
    setParameters,
    loadParameters,
    isUrlSyncEnabled,
    setIsUrlSyncEnabled
  } = useUniversalParameters({
    url,
    onUrlChange: (newUrl) => {
      setUrl(newUrl);
      // Only update input value if this change is NOT from user input
      if (!isUpdatingFromUserInput.current) {
        setUrlInputValue(newUrl);
      }
    },
    // onHeadersChange omitted - headers now managed directly through universal parameters
    onBodyChange: (mode, content) => {
      setBodyMode(mode as any);
      setBodyContent(content);
    },
    isInitialLoad
  });

  // Headers are now handled entirely through universal parameters
  
  // URL and parameter synchronization is now handled by the useUniversalParameters hook
  // This isolates parameter state management and prevents cascading re-renders
  
  // Sync editor language with Content-Type header
  const { language, setLanguage, isTextBased } = useContentTypeSync({
    activeRequestId: activeRequestId || undefined,
    parameters,
    onParametersChange: setParameters,
    defaultLanguage: 'json'
  });
  
  // Auto-save functionality
  const saveRequest = React.useCallback(() => {
    if (activeCollectionId && activeRequestId) {
      const request = findRequestById(activeCollectionId, activeRequestId);
      if (!request) return;

      // Build event array with scripts
      const events = [];
      if (preRequestScript) {
        events.push({
          listen: 'prerequest' as const,
          script: {
            type: 'text/javascript' as const,
            exec: preRequestScript.split('\n')
          }
        });
      }
      if (testScript) {
        events.push({
          listen: 'test' as const,
          script: {
            type: 'text/javascript' as const,
            exec: testScript.split('\n')
          }
        });
      }

      updateRequest(activeCollectionId, activeRequestId, {
        ...request,
        universalParameters: parameters, // Save universal parameters
        request: {
          ...request.request,
          method,
          url: {
            raw: url,
            protocol: undefined,
            host: undefined,
            path: undefined,
            query: [],
            variable: []
          },
          header: parameters
            .filter(p => p.location === 'header')
            .map(p => ({
              key: p.key,
              value: p.value,
              disabled: !p.enabled
            })),
          body: bodyMode !== 'none' ? {
            mode: bodyMode as any,
            raw: bodyContent
          } : undefined,
          auth: request.auth // Preserve auth settings
        },
        event: events.length > 0 ? events : undefined,
        auth: request.auth // Also save at request item level
      });
    }
  }, [activeCollectionId, activeRequestId, method, url, bodyMode, bodyContent, preRequestScript, testScript, parameters, updateRequest, findRequestById]);

  const debouncedSave = useDebounce(saveRequest, 1000);

  // Auto-save when any field changes (but not during initial load)
  React.useEffect(() => {
    if (activeCollectionId && activeRequestId && !isInitialLoad) {
      debouncedSave();
    }
  }, [method, url, bodyMode, bodyContent, preRequestScript, testScript, parameters]);
  
  // Note: Removed problematic effect that was preventing URL input editing
  // urlInputValue is now only synced from url during initial load and parameter changes
  
  React.useEffect(() => {
    if (activeCollectionId && activeRequestId) {
      const request = findRequestById(activeCollectionId, activeRequestId);
      if (request) {
        setActiveRequest(request.request, activeRequestId);
        setMethod(request.request.method);
        const requestUrl = typeof request.request.url === 'string' ? request.request.url : request.request.url.raw;
        setUrl(requestUrl);
        setUrlInputValue(requestUrl); // Sync input value when loading request
        
        // Reset all form state
        setBodyMode('none');
        setBodyContent('');
        setPreRequestScript('');
        setTestScript('');
        
        // Use the hook's loadParameters method to handle all parameter loading
        // This will load headers as universal parameters, so no separate setHeaders needed
        loadParameters(request);
        
        if (request.request.body) {
          setBodyMode(request.request.body.mode as any);
          setBodyContent(request.request.body.raw || '');
        }
        
        // Load scripts if they exist
        if (request.event) {
          const preReq = request.event.find(e => e.listen === 'prerequest');
          const test = request.event.find(e => e.listen === 'test');
          
          if (preReq && preReq.script.exec) {
            setPreRequestScript(preReq.script.exec.join('\n'));
          }
          if (test && test.script.exec) {
            setTestScript(test.script.exec.join('\n'));
          }
        }
      }
      
      // Mark as loaded after a short delay to prevent immediate auto-save
      setTimeout(() => setIsInitialLoad(false), 100);
    } else {
      // Clear everything when no request is selected
      setMethod('GET');
      setUrl('');
      setBodyMode('none');
      setBodyContent('');
      setPreRequestScript('');
      setTestScript('');
      setParameters([]);
      setIsInitialLoad(true);
    }
  }, [activeCollectionId, activeRequestId, findRequestById, setActiveRequest]);
  
  const handleSendRequest = async () => {
    if (!url) return;
    
    // Get the current request for auth
    const currentRequest = activeCollectionId && activeRequestId ? findRequestById(activeCollectionId, activeRequestId) : null;
    
    const grouped = groupParametersByLocation(parameters);
    
    // Build URL with query parameters AND path variables replaced
    const finalUrl = buildUrlWithReplacedVariables(url, parameters);
    const processedUrl = replaceVariables(finalUrl);
    
    // Build headers from universal parameters
    const headerParams = grouped.header.filter(p => p.enabled && p.key.trim());
    
    // Build body from universal parameters
    let requestBody: any = undefined;
    const formDataParams = grouped['form-data'].filter(p => p.enabled && p.key.trim());
    const urlencodedParams = grouped.urlencoded.filter(p => p.enabled && p.key.trim());
    
    if (formDataParams.length > 0) {
      // Form data body
      requestBody = {
        mode: 'form-data',
        formdata: formDataParams.map(p => ({
          key: replaceVariables(p.key),
          value: p.type === 'file' ? { src: p.src } : replaceVariables(p.value),
          type: p.type || 'text'
        }))
      };
    } else if (urlencodedParams.length > 0) {
      // URL encoded body
      const formBody = urlencodedParams
        .map(p => `${encodeURIComponent(replaceVariables(p.key))}=${encodeURIComponent(replaceVariables(p.value))}`)
        .join('&');
      requestBody = {
        mode: 'urlencoded',
        raw: formBody
      };
    } else if (bodyMode !== 'none' && bodyContent) {
      // Raw body (JSON, text, etc.)
      requestBody = {
        mode: 'raw',
        raw: replaceVariables(bodyContent)
      };
    }
    
    await executeRequest({
      method,
      url: processedUrl,
      header: headerParams.map(p => ({
        key: replaceVariables(p.key),
        value: replaceVariables(p.value)
      })),
      body: requestBody,
      auth: currentRequest?.auth
    }, activeRequestId || 'temp-request', {
      preRequest: preRequestScript || undefined,
      test: testScript || undefined
    });
  };
  
  
  const copyAsCode = async (format: keyof typeof codeGenerators) => {
    const request = findRequestById(activeCollectionId!, activeRequestId!);
    if (!request) return;
    
    const variables = resolveAllVariables?.() || {};
    const code = codeGenerators[format]({
      request: {
        ...request.request,
        url,
        method,
        header: parameters
          .filter(p => p.location === 'header' && p.enabled)
          .map(p => ({ key: p.key, value: p.value, enabled: p.enabled }))
      },
      variables
    });
    
    try {
      await navigator.clipboard.writeText(code);
      // TODO: Show toast notification
      console.log(`Copied as ${format}`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const exportOptions = [
    { label: 'Copy as HTTP', onClick: () => copyAsCode('http'), icon: <Copy className="h-4 w-4" /> },
    { label: 'Copy as cURL', onClick: () => copyAsCode('curl'), icon: <Copy className="h-4 w-4" /> },
    { label: 'Copy as JavaScript', onClick: () => copyAsCode('javascript'), icon: <Code className="h-4 w-4" /> },
    { label: 'Copy as Python', onClick: () => copyAsCode('python'), icon: <Code className="h-4 w-4" /> },
    { label: 'Copy as C#', onClick: () => copyAsCode('csharp'), icon: <Code className="h-4 w-4" /> },
    { label: 'Copy as Swift', onClick: () => copyAsCode('swift'), icon: <Code className="h-4 w-4" /> },
    { label: 'Copy as PowerShell', onClick: () => copyAsCode('powershell'), icon: <Code className="h-4 w-4" /> },
  ];
  
  if (!activeRequestId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select a request to get started</p>
      </div>
    );
  }
  
  const request = activeCollectionId && activeRequestId ? findRequestById(activeCollectionId, activeRequestId) : null;
  const collection = activeCollectionId ? collections.get(activeCollectionId) : null;
  
  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="border-b">
        <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto">
          {activeCollectionId && openTabs.map(requestId => {
            const request = findRequestById(activeCollectionId, requestId);
            if (!request) return null;
            
            const isActive = activeRequestId === requestId;
            
            return (
              <div
                key={requestId}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer
                  ${isActive ? 'bg-background border-t border-x' : 'bg-muted hover:bg-muted/80'}
                `}
                onClick={() => {
                  setActiveRequest(request.request, requestId);
                  useCollectionStore.getState().setActiveRequest(requestId);
                }}
              >
                <span className={`
                  text-xs font-medium
                  ${request.request.method === 'GET' ? 'text-green-700' : ''}
                  ${request.request.method === 'POST' ? 'text-blue-700' : ''}
                  ${request.request.method === 'PUT' ? 'text-orange-700' : ''}
                  ${request.request.method === 'DELETE' ? 'text-red-700' : ''}
                `}>
                  {request.request.method}
                </span>
                <span className="text-sm">{request.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(`${activeCollectionId}:${requestId}`);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Request URL Bar */}
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map(m => (
                <SelectItem key={m} value={m}>
                  <span className={`
                    font-medium
                    ${m === 'GET' ? 'text-green-700' : ''}
                    ${m === 'POST' ? 'text-blue-700' : ''}
                    ${m === 'PUT' ? 'text-orange-700' : ''}
                    ${m === 'DELETE' ? 'text-red-700' : ''}
                    ${m === 'PATCH' ? 'text-purple-700' : ''}
                  `}>
                    {m}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div 
            className="flex-1"
            onBlur={(e) => {
              // Check if the blur is leaving the URL input area entirely
              if (!e.currentTarget.contains(e.relatedTarget)) {
                syncUrlFromInput();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                syncUrlFromInput();
                // Blur the input
                if (e.target instanceof HTMLElement) {
                  e.target.blur();
                }
              }
            }}
          >
            <UrlVariableInput
              placeholder="Enter request URL"
              value={urlInputValue}
              vars={variables}
              onChange={(value) => {
                setUrlInputValue(value);
                // Don't sync immediately to avoid disrupting typing
              }}
              onAddVariable={(varName) => {
                setVariableToAdd(varName);
                setShowAddVariableDialog(true);
              }}
              className="w-full"
            />
          </div>
          
          {isLoading ? (
            <Button onClick={abortRequest} variant="destructive">
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <SplitButton 
              onClick={handleSendRequest} 
              options={exportOptions}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </SplitButton>
          )}
        </div>
      </div>
      
      {/* Request Configuration */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="params" className="h-full">
          <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
            <TabsTrigger value="params" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              Params
            </TabsTrigger>
            <TabsTrigger value="body" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              Body
            </TabsTrigger>
            <TabsTrigger value="auth" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              Auth
            </TabsTrigger>
            <TabsTrigger value="pre-request" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              Pre-request Script
            </TabsTrigger>
            <TabsTrigger value="tests" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              Tests
            </TabsTrigger>
          </TabsList>
          
          
          <TabsContent value="body" className="h-[calc(100%-40px)] p-4">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Body Type</Label>
                  <Select value={bodyMode} onValueChange={(v) => setBodyMode(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="raw">Raw</SelectItem>
                      <SelectItem value="form-data">Form Data</SelectItem>
                      <SelectItem value="x-www-form-urlencoded">x-www-form-urlencoded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {bodyMode === 'raw' && (
                  <div className="flex-1">
                    <Label>Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map(option => (
                          <SelectItem key={option.id} value={option.monacoLanguage}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              {bodyMode === 'raw' && (
                <div className="h-[400px]">
                  <React.Suspense fallback={<div className="p-4 text-muted-foreground">Loading editor...</div>}>
                    <MonacoEditor
                      key={`body-${activeRequestId}`}
                      value={bodyContent}
                      onChange={(value) => setBodyContent(value || '')}
                      language={language}
                      theme={theme === "dark" ? "vs-dark" : "vs"}
                      placeholder='{\n  "key": "value"\n}'
                    />
                  </React.Suspense>
                </div>
              )}
              
              {(bodyMode === 'form-data' || bodyMode === 'x-www-form-urlencoded') && (
                <div className="text-muted-foreground text-sm">
                  Form data support coming soon...
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="auth" className="h-[calc(100%-40px)] p-4 overflow-y-auto">
            <AuthenticationEditor
              auth={request?.auth}
              onChange={(auth) => {
                if (activeCollectionId && activeRequestId && request) {
                  updateRequest(activeCollectionId, activeRequestId, {
                    ...request,
                    auth
                  });
                }
              }}
              collectionAuth={collection?.collection.auth}
              variables={variables}
            />
          </TabsContent>
          
          <TabsContent value="params" className="h-[calc(100%-40px)] p-0">
            <UniversalParametersEditor
              parameters={parameters}
              onChange={setParameters}
            />
          </TabsContent>
          
          <TabsContent value="pre-request" className="h-[calc(100%-40px)] p-0">
            <div className="h-full flex flex-col">
              <div className="p-3 border-b flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Pre-request scripts run before the request is sent. Use the pm object to set variables or modify the request.
                </p>
                <ScriptExamplesDropdown 
                  type="pre-request" 
                  onSelect={(code) => setPreRequestScript(code)}
                />
              </div>
              <div className="flex-1">
                <React.Suspense fallback={<div className="p-4 text-muted-foreground">Loading editor...</div>}>
                  <MonacoEditor
                    key={`pre-${activeRequestId}`}
                    value={preRequestScript}
                    onChange={(value) => setPreRequestScript(value || '')}
                    language="api-script"
                    placeholder="// Example: Set headers&#10;pm.request.headers.add({ key: 'X-Auth-Token', value: pm.environment.get('token') });&#10;&#10;// Example: Set environment variable&#10;pm.environment.set('authToken', 'your-token-here');"
                    theme={theme === "dark" ? "vs-dark" : "vs"}
                  />
                </React.Suspense>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tests" className="h-[calc(100%-40px)] p-0">
            <div className="h-full flex flex-col">
              <div className="p-3 border-b flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Test scripts run after the response is received. Write tests to validate the response.
                </p>
                <ScriptExamplesDropdown 
                  type="test" 
                  onSelect={(code) => setTestScript(code)}
                />
              </div>
              <div className="flex-1">
                <React.Suspense fallback={<div className="p-4 text-muted-foreground">Loading editor...</div>}>
                  <MonacoEditor
                    key={`test-${activeRequestId}`}
                    value={testScript}
                    onChange={(value) => setTestScript(value || '')}
                    language="api-script"
                    theme={theme === "dark" ? "vs-dark" : "vs"}
                    placeholder="// Example: Test response status&#10;pm.test('Status is 200', () => {&#10;  pm.expect(pm.response).to.have.status(200);&#10;});"
                  />
                </React.Suspense>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add Variable Dialog */}
      <AddVariableDialog
        open={showAddVariableDialog}
        onOpenChange={setShowAddVariableDialog}
        variableName={variableToAdd}
        onSuccess={() => {
          setVariableToAdd('');
          // The URL will automatically update to show the new variable in green
        }}
      />
    </div>
  );
}