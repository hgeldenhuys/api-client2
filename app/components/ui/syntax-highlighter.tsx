import React from "react";
import { Button } from "~/components/ui/button";
import { Copy } from "lucide-react";
import { cn } from "~/utils/cn";

// Lazy load Monaco Editor
const MonacoEditor = React.lazy(() =>
  import("../MonacoEditor").then((module) => ({
    default: module.MonacoEditor,
  })),
);

interface CodeHighlighterProps {
  children: string;
  language?: string;
  className?: string;
  showCopyButton?: boolean;
  customStyle?: React.CSSProperties;
  showLineNumbers?: boolean;
  theme?: "light" | "dark" | "auto";
}

export function CodeHighlighter({
  children,
  language = "text",
  className,
  showCopyButton = true,
  customStyle,
  showLineNumbers = false,
  theme = "auto",
}: CodeHighlighterProps) {
  const [copied, setCopied] = React.useState(false);

  // Determine theme based on prop or system preference
  const resolvedTheme = React.useMemo(() => {
    if (theme !== "auto") return theme;

    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    return "dark"; // Default to dark
  }, [theme]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  // Map common language aliases to Monaco languages
  const normalizeLanguage = (lang: string) => {
    const languageMap: Record<string, string> = {
      http: "http",
      js: "javascript",
      javascript: "javascript",
      ts: "typescript",
      typescript: "typescript",
      json: "json",
      html: "html",
      xml: "xml",
      css: "css",
      bash: "shell",
      shell: "shell",
      text: "plaintext",
      plain: "plaintext",
    };

    return languageMap[lang.toLowerCase()] || "plaintext";
  };

  const normalizedLanguage = normalizeLanguage(language);

  // Calculate height based on content
  const calculateHeight = () => {
    const lines = children.split("\n").length;
    const lineHeight = 19; // Approximate line height in Monaco
    const padding = 20; // Padding for the editor
    const maxHeight = customStyle?.maxHeight
      ? parseInt(customStyle.maxHeight.toString().replace("px", ""))
      : 400;

    const calculatedHeight = Math.min(lines * lineHeight + padding, maxHeight);
    return `${calculatedHeight}px`;
  };

  return (
    <div className={cn("relative group", className)}>
      <div
        className="rounded-md overflow-hidden border border-border"
        style={{
          height: calculateHeight(),
          ...customStyle,
        }}
      >
        <React.Suspense
          fallback={
            <div className="p-4 bg-muted text-muted-foreground font-mono text-sm">
              <pre>{children}</pre>
            </div>
          }
        >
          <MonacoEditor
            value={children}
            language={normalizedLanguage}
            theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
            readOnly={true}
            minimap={false}
            height={calculateHeight()}
          />
        </React.Suspense>
      </div>

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
    <code
      className={cn(
        "px-1.5 py-0.5 bg-muted rounded text-sm font-mono",
        "border border-border/50",
        className,
      )}
    >
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
  theme?: "light" | "dark" | "auto";
}

export function HttpRequestHighlighter({
  method,
  url,
  headers,
  body,
  showCopyButton = true,
  theme = "auto",
}: HttpRequestHighlighterProps) {
  const httpRequest = React.useMemo(() => {
    let request = `${method.toUpperCase()} ${url}`;

    if (headers && Object.keys(headers).length > 0) {
      request +=
        "\n" +
        Object.entries(headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
    }

    if (body) {
      request += "\n\n" + body;
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
  theme?: "light" | "dark" | "auto";
}

export function JsonHighlighter({
  data,
  showCopyButton = true,
  maxHeight,
  theme = "auto",
}: JsonHighlighterProps) {
  const jsonString = React.useMemo(() => {
    try {
      return typeof data === "string" ? data : JSON.stringify(data, null, 2);
    } catch (err) {
      return String(data);
    }
  }, [data]);

  const customStyle = maxHeight
    ? { maxHeight, overflowY: "auto" as const }
    : undefined;

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
