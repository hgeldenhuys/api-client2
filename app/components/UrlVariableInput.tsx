import React, { useRef, useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "~/lib/utils";

interface UrlVariableInputProps {
  readonly value: string;
  readonly vars?: Record<string, string>;
  readonly onAddVariable?: (variableName: string) => void;
  readonly onChange?: (value: string) => void;
  readonly placeholder?: string;
  readonly className?: string;
  readonly showPreviewButton?: boolean;
  readonly id?: string;
  readonly type?: string;
  readonly isPasswordField?: boolean; // Indicates this is a password field (can be toggled)
}

export const UrlVariableInput: React.FC<UrlVariableInputProps> = ({
  value,
  vars = {},
  onAddVariable,
  onChange,
  placeholder,
  className = "",
  showPreviewButton = true,
  id,
  type,
  isPasswordField = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Determine the actual input type based on password field state
  const actualType = isPasswordField
    ? showPassword
      ? "text"
      : "password"
    : type;

  // Parse the URL and identify variable placeholders
  const parseUrl = (urlString: string) => {
    const regex = /\{\{([^}]+)\}\}/g;
    const parts: Array<{
      type: "text" | "variable";
      content: string;
      start: number;
      end: number;
    }> = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(urlString)) !== null) {
      // Add text before the variable
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: urlString.slice(lastIndex, match.index),
          start: lastIndex,
          end: match.index,
        });
      }

      // Add the variable
      parts.push({
        type: "variable",
        content: match[1],
        start: match.index,
        end: regex.lastIndex,
      });

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < urlString.length) {
      parts.push({
        type: "text",
        content: urlString.slice(lastIndex),
        start: lastIndex,
        end: urlString.length,
      });
    }

    return parts;
  };

  const urlParts = parseUrl(value);

  // Sync scroll position
  const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  // Keyboard shortcut for preview mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        setIsPreviewMode((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle variable clicks
  const handleVariableClick = (varName: string, varExists: boolean) => {
    if (!varExists && onAddVariable) {
      onAddVariable(varName);
    }
  };

  // Base styles for both input and display
  const baseStyles = "font-mono text-sm px-3 py-2";

  // Get preview value with resolved variables
  const getPreviewValue = () => {
    if (!isPreviewMode) return null;

    let previewText = value;
    const regex = /\{\{([^}]+)\}\}/g;

    previewText = previewText.replace(regex, (match, varName) => {
      const trimmedName = varName.trim();
      // vars should already contain recursively resolved values
      return vars[trimmedName] !== undefined ? vars[trimmedName] : match;
    });

    return previewText;
  };

  const previewValue = getPreviewValue();

  return (
    <TooltipProvider>
      <div className={cn("relative flex items-center gap-2", className)}>
        <div className="relative flex-1">
          {/* Hidden input field */}
          <input
            ref={inputRef}
            id={id}
            type={actualType ?? "text"}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onScroll={handleScroll}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isPreviewMode && !isPasswordField}
            className={cn(
              baseStyles,
              "w-full border rounded-md text-transparent caret-black focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-x-auto scrollbar-hide",
              isPreviewMode &&
                "bg-blue-50 dark:bg-blue-950/20 cursor-not-allowed",
              !isPreviewMode && "bg-white dark:bg-gray-950",
            )}
            style={{
              caretColor: isPreviewMode ? "transparent" : "black",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          />

          {/* Display layer */}
          <div
            ref={displayRef}
            className={cn(
              baseStyles,
              "absolute inset-0 pointer-events-none overflow-x-auto scrollbar-hide whitespace-pre border rounded-md transition-colors",
              isFocused && "ring-2 ring-blue-500",
              isPreviewMode && "bg-blue-50 dark:bg-blue-950/20",
            )}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {value.length === 0 && placeholder && (
              <span className="text-gray-400">{placeholder}</span>
            )}
            {isPreviewMode ? (
              // Preview mode - show resolved values
              <>
                {urlParts.map((part, index) => {
                  if (part.type === "text") {
                    // Mask password even in preview mode if type is password
                    const displayContent =
                      actualType === "password"
                        ? "•".repeat(part.content.length)
                        : part.content;
                    return (
                      <span
                        key={index}
                        className="text-gray-900 dark:text-gray-100"
                      >
                        {displayContent}
                      </span>
                    );
                  }

                  const trimmedContent = part.content.trim();
                  const varValue = vars[trimmedContent];
                  const varExists = trimmedContent in vars;

                  if (varExists) {
                    return (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <span className="text-blue-600 dark:text-blue-400 font-medium pointer-events-auto cursor-help">
                            {varValue}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <div className="font-semibold">{`{{${part.content}}}`}</div>
                            <div className="text-gray-600 dark:text-gray-400">
                              {varValue}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  } else {
                    return (
                      <span
                        key={index}
                        className="text-red-600 dark:text-red-400 font-medium pointer-events-auto cursor-pointer"
                        onClick={() => handleVariableClick(part.content, false)}
                      >
                        {`{{${part.content}}}`}
                      </span>
                    );
                  }
                })}
              </>
            ) : (
              // Normal mode - show variables with colors
              urlParts.map((part, index) => {
                if (part.type === "text") {
                  // Mask password if type is password
                  const displayContent =
                    actualType === "password"
                      ? "•".repeat(part.content.length)
                      : part.content;
                  return <span key={index}>{displayContent}</span>;
                }

                const varExists = part.content in vars;
                const varValue = vars[part.content];

                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <span
                        className={`pointer-events-auto cursor-pointer ${
                          varExists ? "text-green-600" : "text-red-600"
                        }`}
                        onClick={() =>
                          handleVariableClick(part.content, varExists)
                        }
                      >
                        {`{{${part.content}}}`}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {varExists ? (
                        <div>
                          <div className="font-semibold">{part.content}</div>
                          <div className="text-sm text-gray-600">
                            {varValue}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-red-600">
                            Variable not found
                          </div>
                          <div className="text-sm">
                            Click to add "{part.content}"
                          </div>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>
        </div>

        {/* Preview/Password toggle button */}
        {showPreviewButton && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => {
                  if (isPasswordField) {
                    setShowPassword(!showPassword);
                  } else {
                    setIsPreviewMode(!isPreviewMode);
                  }
                }}
              >
                {isPasswordField ? (
                  showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )
                ) : isPreviewMode ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {isPasswordField ? (
                  showPassword ? (
                    "Hide password"
                  ) : (
                    "Show password"
                  )
                ) : (
                  <>
                    {isPreviewMode ? "Hide preview" : "Preview with variables"}
                    <kbd className="ml-2 text-xs">⌘E</kbd>
                  </>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Global styles to hide scrollbars */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </TooltipProvider>
  );
};

// Example usage component
const Example: React.FC = () => {
  const [url, setUrl] = useState("{{baseUrl}}/users/{{userId}}/profile");
  const [variables, setVariables] = useState<Record<string, string>>({
    baseUrl: "https://api.example.com",
    apiKey: "abc123",
    userId: "12345",
  });

  const handleAddVariable = (varName: string) => {
    const value = prompt(`Enter value for "${varName}":`);
    if (value !== null) {
      setVariables((prev) => ({ ...prev, [varName]: value }));
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold mb-4">
          URL Variable Input Component
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Editable URL Inputs:</h3>
            <div className="space-y-3">
              <UrlVariableInput
                value={url}
                vars={variables}
                onChange={setUrl}
                onAddVariable={handleAddVariable}
                placeholder="Enter a URL with {{variables}}"
              />

              <UrlVariableInput
                value="{{baseUrl}}/api/v1/data?key={{apiKey}}&user={{userId}}"
                vars={variables}
                onChange={(val) => console.log("Changed:", val)}
                onAddVariable={handleAddVariable}
              />

              <UrlVariableInput
                value="{{baseUrl}}/missing/{{missingVar}}/endpoint"
                vars={variables}
                onChange={(val) => console.log("Changed:", val)}
                onAddVariable={handleAddVariable}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Current Variables:</h3>
            <div className="bg-gray-50 p-4 rounded space-y-1">
              {Object.entries(variables).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-medium">{key}:</span>{" "}
                  <span className="text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>• Type or edit URLs directly in the input fields</p>
            <p>• Green variables exist in the vars object</p>
            <p>• Red variables are missing</p>
            <p>• Hover over any variable to see its value</p>
            <p>• Click on red variables to add them</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Example;
