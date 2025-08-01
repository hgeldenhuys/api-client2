import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Settings,
  Globe,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  RefreshCw,
} from "lucide-react";
import { useProxyStore } from "~/stores/proxyStore";

export function SettingsView() {
  const {
    isEnabled,
    proxyUrl,
    autoDetectCors,
    proxyStatus,
    setEnabled,
    setProxyUrl,
    setAutoDetectCors,
    checkProxyConnection,
  } = useProxyStore();

  const [isCheckingProxy, setIsCheckingProxy] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState<string | null>(null);

  const handleProxyCheck = async () => {
    setIsCheckingProxy(true);
    await checkProxyConnection();
    setIsCheckingProxy(false);
  };

  const copyProxyScript = async (language: string) => {
    try {
      // For now, copy instructions on how to get the script
      const instructions: Record<string, string> = {
        typescript: `# Run from your API Client project directory:
bun proxy-server.ts

# With verbose logging (recommended for debugging):
bun proxy-server.ts -v

# Custom port (if 9090 is in use):
bun proxy-server.ts -p 8080

# The proxy server is included in your project root`,

        python: `# Python proxy server (standalone, no dependencies):
curl -o proxy.py https://raw.githubusercontent.com/api-client/cors-proxy/main/proxy.py
python proxy.py

# Or create a simple Python proxy:
python -m http.server 9090 --cgi

# Note: Use the TypeScript version for full features`,

        go: `# Go proxy server (standalone, no dependencies):
curl -o proxy.go https://raw.githubusercontent.com/api-client/cors-proxy/main/proxy.go
go run proxy.go

# Or run from project if available:
go run ./proxy-server/scripts/proxy.go

# Note: Use the TypeScript version for full features`,
      };

      const instruction = instructions[language];
      if (instruction) {
        await navigator.clipboard.writeText(instruction);
        setCopyStatus(language);
        setTimeout(() => setCopyStatus(null), 2000);
      }
    } catch (error) {
      console.error("Failed to copy instructions:", error);
      // TODO: Show error toast
    }
  };

  return (
    <div className="h-full overflow-hidden">
      <Tabs defaultValue="general" className="h-full">
        <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
          <TabsTrigger
            value="general"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger
            value="proxy"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Globe className="h-4 w-4 mr-2" />
            Proxy
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="general"
          className="h-[calc(100%-40px)] overflow-y-auto p-6"
        >
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general application preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Request Timeout</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="30" className="w-24" />
                    <span className="text-sm text-muted-foreground">
                      seconds
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Default Headers</Label>
                  <div className="text-sm text-muted-foreground">
                    Configure default headers in the Environment settings
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="proxy"
          className="h-[calc(100%-40px)] overflow-y-auto p-6"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Proxy Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>CORS Proxy</span>
                  <div className="flex items-center gap-2">
                    {proxyStatus === "connected" && (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Connected
                      </Badge>
                    )}
                    {proxyStatus === "disconnected" && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Disconnected
                      </Badge>
                    )}
                    {proxyStatus === "checking" && (
                      <Badge variant="secondary" className="gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Checking...
                      </Badge>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  Use a local proxy server to bypass CORS restrictions when
                  testing APIs. Supports all origins, methods, and headers for maximum compatibility.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enable Proxy */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable CORS Proxy</Label>
                    <div className="text-sm text-muted-foreground">
                      Route requests through a local proxy server
                    </div>
                  </div>
                  <Button
                    variant={isEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEnabled(!isEnabled)}
                  >
                    {isEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>

                {/* Proxy URL */}
                <div className="space-y-2">
                  <Label>Proxy Server URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={proxyUrl}
                      onChange={(e) => setProxyUrl(e.target.value)}
                      placeholder="http://localhost:9090"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleProxyCheck}
                      disabled={isCheckingProxy}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isCheckingProxy ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </div>

                {/* Auto-detect CORS */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-detect CORS Errors</Label>
                    <div className="text-sm text-muted-foreground">
                      Automatically enable proxy when CORS errors are detected. The proxy will activate instantly to resolve CORS issues.
                    </div>
                  </div>
                  <Button
                    variant={autoDetectCors ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoDetectCors(!autoDetectCors)}
                  >
                    {autoDetectCors ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Download Proxy Server */}
            <Card>
              <CardHeader>
                <CardTitle>Proxy Server Scripts</CardTitle>
                <CardDescription>
                  Copy commands to download and run the proxy server using your
                  preferred runtime
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Runtime scripts */}
                <div className="space-y-2">
                  <Label>Runtime Scripts</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => copyProxyScript("typescript")}
                      >
                        <span className="flex items-center">
                          {copyStatus === "typescript" ? (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 mr-2" />
                          )}
                          TypeScript/Bun
                        </span>
                        {copyStatus === "typescript" ? (
                          <span className="text-xs text-green-600">
                            Copied!
                          </span>
                        ) : (
                          <ExternalLink className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => copyProxyScript("python")}
                      >
                        <span className="flex items-center">
                          {copyStatus === "python" ? (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 mr-2" />
                          )}
                          Python
                        </span>
                        {copyStatus === "python" ? (
                          <span className="text-xs text-green-600">
                            Copied!
                          </span>
                        ) : (
                          <ExternalLink className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => copyProxyScript("go")}
                      >
                        <span className="flex items-center">
                          {copyStatus === "go" ? (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 mr-2" />
                          )}
                          Go
                        </span>
                        {copyStatus === "go" ? (
                          <span className="text-xs text-green-600">
                            Copied!
                          </span>
                        ) : (
                          <ExternalLink className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        disabled
                        title="C# proxy server not yet available"
                      >
                        <span className="flex items-center">
                          <Copy className="h-4 w-4 mr-2" />
                          C# (.NET)
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Coming soon
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm space-y-1">
                      <p className="font-medium">Quick Start:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>
                          Click a script button above to copy the commands
                        </li>
                        <li>Paste and run the commands in your terminal</li>
                        <li>The proxy will start on port 9090 by default</li>
                        <li>Enable the proxy in settings above (or let auto-detect enable it)</li>
                        <li>All requests will now bypass CORS restrictions automatically</li>
                      </ol>
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium">
                          Enhanced CORS Support:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>
                            • <strong>Zero CORS Restrictions</strong> - All origins, methods, and headers allowed
                          </li>
                          <li>
                            • <strong>Auto-Detection</strong> - Proxy automatically enables when CORS errors occur
                          </li>
                          <li>
                            • <strong>Localhost Development</strong> - Perfect for local API testing
                          </li>
                          <li>
                            • <strong>Transparent Proxying</strong> - Preserves original request/response data
                          </li>
                        </ul>
                        
                        <p className="text-xs font-medium mt-3">
                          Supported runtimes:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>
                            • <strong>Bun/Node.js</strong> - TypeScript proxy
                            server
                          </li>
                          <li>
                            • <strong>Python 3.6+</strong> - No dependencies
                            required
                          </li>
                          <li>
                            • <strong>Go 1.16+</strong> - No dependencies
                            required
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Proxy Settings</CardTitle>
                <CardDescription>
                  Configure advanced proxy behavior and security options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Proxy Authentication</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Username"
                      className="flex-1"
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty if proxy doesn't require authentication
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>SSL Certificate Verification</Label>
                  <Select defaultValue="default">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        Default (Verify certificates)
                      </SelectItem>
                      <SelectItem value="ignore">
                        Ignore certificate errors
                      </SelectItem>
                      <SelectItem value="strict">
                        Strict verification
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
