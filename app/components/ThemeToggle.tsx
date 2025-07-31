import React, { useEffect } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "~/stores/themeStore";
import type { ThemeMode } from "~/cookies/theme.server";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const fetcher = useFetcher();

  // Get the optimistic theme value
  const optimisticTheme =
    (fetcher.formData?.get("theme") as ThemeMode | undefined) ?? theme;

  const handleThemeChange = (newTheme: ThemeMode) => {
    // Immediately update local state and DOM
    setTheme(newTheme);

    // Update data-theme attribute
    document.documentElement.setAttribute("data-theme", newTheme);

    // Apply theme class immediately
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (newTheme === "dark" || (newTheme === "system" && systemDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Update hint cookie for system theme
    if (newTheme === "system") {
      const hint = systemDark ? "dark" : "light";
      document.cookie = `theme-hint=${hint}; path=/; max-age=31536000; samesite=lax`;
    }

    // Submit to server without navigation
    fetcher.submit(
      { theme: newTheme },
      { method: "POST", action: "/api-client/api/theme" },
    );
  };

  // Apply theme on mount and when it changes
  useEffect(() => {
    const applyTheme = (themeMode: ThemeMode) => {
      // Update data-theme attribute
      document.documentElement.setAttribute("data-theme", themeMode);

      const systemDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;

      if (themeMode === "dark" || (themeMode === "system" && systemDark)) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      // Update hint cookie for system theme
      if (themeMode === "system") {
        const hint = systemDark ? "dark" : "light";
        document.cookie = `theme-hint=${hint}; path=/; max-age=31536000; samesite=lax`;
      }
    };

    applyTheme(theme);

    // Listen for system theme changes if in system mode
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme("system");
        // Update hint cookie
        const hint = e.matches ? "dark" : "light";
        document.cookie = `theme-hint=${hint}; path=/; max-age=31536000; samesite=lax`;
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const getThemeIcon = () => {
    switch (optimisticTheme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      case "system":
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getThemeLabel = (themeMode: ThemeMode) => {
    switch (themeMode) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
          {getThemeIcon()}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleThemeChange("light")}
          className="flex items-center gap-2"
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {optimisticTheme === "light" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("dark")}
          className="flex items-center gap-2"
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {optimisticTheme === "dark" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("system")}
          className="flex items-center gap-2"
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {optimisticTheme === "system" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
