import React from "react";
import { useRequestStore } from "~/stores/requestStore";
import { useProxyStore } from "~/stores/proxyStore";
import { useViewNavigation } from "~/components/ViewRouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Copy,
  Download,
  Maximize2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Code,
  AlertCircle,
  Settings,
} from "lucide-react";
import { ResponseBodyEditor } from "./ResponseBodyEditor";
import { HtmlPreview } from "./HtmlPreview";
import { MarkdownPreview } from "./MarkdownPreview";

export function ResponseViewer() {
  const {
    currentResponse,
    isLoading,
    preRequestScriptResult,
    testScriptResult,
  } = useRequestStore();

  const proxyStore = useProxyStore();
  const { navigateToSettings } = useViewNavigation();

  const [responseView, setResponseView] = React.useState<
    "pretty" | "raw" | "preview"
  >("pretty");

  // Helper function to get console line styling based on content
  const getConsoleLineClass = (line: string): string => {
    if (line.startsWith("[ERROR]")) return "text-red-500";
    if (line.startsWith("[WARN]")) return "text-yellow-500";
    if (line.startsWith("[INFO]")) return "text-blue-500";
    if (line.startsWith("[DEBUG]")) return "text-gray-500";
    if (line.startsWith("[ALERT]")) return "text-orange-500";
    return "text-muted-foreground";
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return "text-green-600";
    if (status >= 300 && status < 400) return "text-blue-600";
    if (status >= 400 && status < 500) return "text-orange-600";
    if (status >= 500) return "text-red-600";
    return "text-gray-600";
  };

  const copyToClipboard = () => {
    const textToCopy =
      responseView === "pretty"
        ? formatJson(currentResponse?.body)
        : getBodyAsString();
    navigator.clipboard.writeText(textToCopy);
  };

  const downloadResponse = () => {
    if (!currentResponse) return;

    const contentType = getContentType();
    const content =
      responseView === "pretty"
        ? formatJson(currentResponse.body)
        : getBodyAsString();

    // Determine file extension based on content type
    let extension = "txt";
    if (contentType.includes("json")) extension = "json";
    else if (contentType.includes("html")) extension = "html";
    else if (contentType.includes("xml")) extension = "xml";
    else if (contentType.includes("css")) extension = "css";
    else if (contentType.includes("javascript")) extension = "js";
    else if (contentType.includes("markdown")) extension = "md";

    const blob = new Blob([content], {
      type: contentType || "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `response-${currentResponse.id}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatJson = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const getContentType = (): string => {
    if (!currentResponse?.headers) return "";
    return (
      currentResponse.headers["content-type"] ||
      currentResponse.headers["Content-Type"] ||
      ""
    );
  };

  const canPreview = (): boolean => {
    const contentType = getContentType().toLowerCase();
    return contentType.includes("html") || contentType.includes("markdown");
  };

  const getBodyAsString = (): string => {
    if (!currentResponse?.body) return "";
    if (typeof currentResponse.body === "string") return currentResponse.body;
    return JSON.stringify(currentResponse.body);
  };

  if (!currentResponse && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-8">
        <div className="text-center">
          <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-sm">Send a request to see the response</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Sending request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Response Status Bar */}
      <div className="border-b p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span
                className={`font-medium ${getStatusColor(currentResponse?.status || 0)}`}
              >
                {currentResponse?.status} {currentResponse?.statusText}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatDuration(currentResponse?.duration || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatBytes(currentResponse?.size || 0)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              title="Copy response"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadResponse}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Test Results Summary */}
        {testScriptResult && testScriptResult.tests.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                {testScriptResult.tests.filter((t) => t.passed).length} passed
              </span>
            </div>
            {testScriptResult.tests.filter((t) => !t.passed).length > 0 && (
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" />
                <span className="text-red-600">
                  {testScriptResult.tests.filter((t) => !t.passed).length}{" "}
                  failed
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="body" className="h-full">
          <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
            <TabsTrigger
              value="body"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Body
            </TabsTrigger>
            <TabsTrigger
              value="headers"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Headers
            </TabsTrigger>
            <TabsTrigger
              value="tests"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              disabled={
                !testScriptResult || testScriptResult.tests.length === 0
              }
            >
              Test Results
            </TabsTrigger>
            <TabsTrigger
              value="console"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              disabled={
                (!preRequestScriptResult ||
                  preRequestScriptResult.consoleOutput.length === 0) &&
                (!testScriptResult ||
                  testScriptResult.consoleOutput.length === 0)
              }
            >
              Console
            </TabsTrigger>
          </TabsList>

          <TabsContent value="body" className="h-[calc(100%-40px)] p-0">
            <div className="h-full flex flex-col">
              <div className="border-b p-2">
                <div className="flex gap-1">
                  <Button
                    variant={responseView === "pretty" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setResponseView("pretty")}
                  >
                    Pretty
                  </Button>
                  <Button
                    variant={responseView === "raw" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setResponseView("raw")}
                  >
                    Raw
                  </Button>
                  {canPreview() && (
                    <Button
                      variant={
                        responseView === "preview" ? "secondary" : "ghost"
                      }
                      size="sm"
                      onClick={() => setResponseView("preview")}
                    >
                      Preview
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {currentResponse?.error ? (
                  <div className="p-4">
                    {currentResponse.isCorsError ? (
                      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                        <div className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div className="flex-1">
                              <h3 className="font-medium text-orange-900 dark:text-orange-100">
                                CORS Error Detected
                              </h3>
                              <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                                {currentResponse.error}
                              </p>
                            </div>
                          </div>

                          {!proxyStore.isEnabled && (
                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                onClick={() => {
                                  proxyStore.setEnabled(true);
                                  // TODO: Show toast notification
                                }}
                                size="sm"
                                className="gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Enable Proxy
                              </Button>
                              <Button
                                onClick={navigateToSettings}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                              >
                                <Settings className="h-4 w-4" />
                                Go to Settings
                              </Button>
                            </div>
                          )}

                          {proxyStore.isEnabled &&
                            proxyStore.proxyStatus !== "connected" && (
                              <div className="bg-orange-100 dark:bg-orange-900/30 rounded-md p-3">
                                <p className="text-sm text-orange-800 dark:text-orange-200">
                                  Proxy is enabled but not connected. Make sure
                                  your proxy server is running at{" "}
                                  <code className="font-mono bg-orange-200 dark:bg-orange-800 px-1 rounded">
                                    {proxyStore.proxyUrl}
                                  </code>
                                </p>
                              </div>
                            )}
                        </div>
                      </Card>
                    ) : (
                      <div className="text-red-600">
                        <p className="font-medium mb-2">Error:</p>
                        <pre className="text-sm">{currentResponse.error}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full">
                    {responseView === "pretty" && (
                      <ResponseBodyEditor
                        body={currentResponse?.body}
                        contentType={getContentType()}
                        height="100%"
                      />
                    )}
                    {responseView === "raw" && (
                      <div className="p-4">
                        <pre className="text-sm font-mono whitespace-pre-wrap">
                          {getBodyAsString()}
                        </pre>
                      </div>
                    )}
                    {responseView === "preview" && (
                      <>
                        {getContentType().includes("html") ? (
                          <HtmlPreview html={getBodyAsString()} />
                        ) : getContentType().includes("markdown") ? (
                          <MarkdownPreview markdown={getBodyAsString()} />
                        ) : (
                          <div className="text-sm text-muted-foreground p-4">
                            Preview is only available for HTML and Markdown
                            responses
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="headers"
            className="h-[calc(100%-40px)] overflow-auto p-4"
          >
            <div className="space-y-2">
              {currentResponse?.headers &&
                Object.entries(currentResponse.headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="font-medium text-muted-foreground min-w-[200px]">
                      {key}:
                    </span>
                    <span className="font-mono">{value}</span>
                  </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent
            value="tests"
            className="h-[calc(100%-40px)] overflow-auto p-4"
          >
            {testScriptResult && (
              <div className="space-y-2">
                {testScriptResult.tests.map((test, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center gap-2">
                      {test.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">{test.name}</span>
                    </div>
                    {test.error && (
                      <p className="text-sm text-red-600 mt-1 ml-6">
                        {test.error}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="console"
            className="h-[calc(100%-40px)] overflow-auto p-4"
          >
            <div className="space-y-4 font-mono text-sm">
              {preRequestScriptResult &&
                preRequestScriptResult.consoleOutput.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">
                      Pre-request Script
                    </div>
                    <div className="space-y-1">
                      {preRequestScriptResult.consoleOutput.map(
                        (line, index) => (
                          <div
                            key={`pre-${index}`}
                            className={getConsoleLineClass(line)}
                          >
                            {line}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              {testScriptResult &&
                testScriptResult.consoleOutput.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">
                      Test Script
                    </div>
                    <div className="space-y-1">
                      {testScriptResult.consoleOutput.map((line, index) => (
                        <div
                          key={`test-${index}`}
                          className={getConsoleLineClass(line)}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
