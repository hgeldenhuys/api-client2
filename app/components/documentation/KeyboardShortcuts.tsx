import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/utils/cn";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  {
    keys: ["⌘", "1"],
    description: "Go to Collections",
    category: "Navigation",
  },
  {
    keys: ["⌘", "2"],
    description: "Go to Environments",
    category: "Navigation",
  },
  {
    keys: ["⌘", "3"],
    description: "Go to Documentation",
    category: "Navigation",
  },
  { keys: ["⌘", "4"], description: "Go to Globals", category: "Navigation" },
  { keys: ["⌘", "5"], description: "Go to Settings", category: "Navigation" },

  // Request Actions
  { keys: ["⌘", "Enter"], description: "Send request", category: "Request" },
  { keys: ["⌘", "S"], description: "Save request", category: "Request" },
  { keys: ["⌘", "N"], description: "New request", category: "Request" },
  { keys: ["⌘", "D"], description: "Duplicate request", category: "Request" },

  // Editor
  { keys: ["⌘", "/"], description: "Comment line", category: "Editor" },
  { keys: ["⌘", "F"], description: "Find in editor", category: "Editor" },
  { keys: ["⌘", "Shift", "F"], description: "Format code", category: "Editor" },
  { keys: ["Tab"], description: "Accept autocomplete", category: "Editor" },

  // General
  { keys: ["⌘", "K"], description: "Command palette", category: "General" },
  { keys: ["⌘", "B"], description: "Toggle sidebar", category: "General" },
  { keys: ["⌘", ","], description: "Open settings", category: "General" },
  { keys: ["?"], description: "Show keyboard shortcuts", category: "General" },

  // Tabs
  { keys: ["⌘", "W"], description: "Close tab", category: "Tabs" },
  { keys: ["⌘", "Tab"], description: "Next tab", category: "Tabs" },
  {
    keys: ["⌘", "Shift", "Tab"],
    description: "Previous tab",
    category: "Tabs",
  },
];

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcuts({
  open,
  onOpenChange,
}: KeyboardShortcutsProps) {
  const categories = React.useMemo(() => {
    const cats = new Set(shortcuts.map((s) => s.category));
    return Array.from(cats);
  }, []);

  const isMac = React.useMemo(() => {
    return (
      typeof window !== "undefined" &&
      navigator.platform.toUpperCase().indexOf("MAC") >= 0
    );
  }, []);

  const formatKey = (key: string) => {
    if (!isMac) {
      if (key === "⌘") return "Ctrl";
    }
    return key;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts
                    .filter((s) => s.category === category)
                    .map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/50"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <React.Fragment key={i}>
                              <kbd
                                className={cn(
                                  "px-2 py-1 text-xs font-mono rounded",
                                  "bg-muted border border-border",
                                  "dark:bg-muted/50",
                                )}
                              >
                                {formatKey(key)}
                              </kbd>
                              {i < shortcut.keys.length - 1 && (
                                <span className="text-xs text-muted-foreground">
                                  +
                                </span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Press{" "}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">?</kbd>{" "}
            anytime to show this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
