import React from "react";
import { useTheme } from "~/stores/themeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, isInitialized } = useTheme();

  // Apply theme class to document element on client-side
  React.useEffect(() => {
    if (isInitialized) {
      const html = document.documentElement;

      // Remove both classes first
      html.classList.remove("light", "dark");

      // Add the resolved theme class
      html.classList.add(resolvedTheme);
    }
  }, [resolvedTheme, isInitialized]);

  return <>{children}</>;
}
