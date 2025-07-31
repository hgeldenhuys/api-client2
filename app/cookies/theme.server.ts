import { createCookie } from "react-router";

export type ThemeMode = "light" | "dark" | "system";

export const themeCookie = createCookie("theme", {
  maxAge: 60 * 60 * 24 * 365, // 1 year
  httpOnly: false, // Allow client access for immediate updates
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

// Cookie to store the resolved system theme (light/dark) for SSR
export const themeHintCookie = createCookie("theme-hint", {
  maxAge: 60 * 60 * 24 * 365, // 1 year
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

export async function getThemeFromRequest(
  request: Request,
): Promise<ThemeMode> {
  const cookieHeader = request.headers.get("Cookie");
  const theme = await themeCookie.parse(cookieHeader);

  // Validate theme value
  if (theme === "light" || theme === "dark" || theme === "system") {
    return theme;
  }

  // Default to system if invalid or not set
  return "system";
}

export async function setThemeCookie(theme: ThemeMode): Promise<string> {
  return await themeCookie.serialize(theme);
}

export async function getResolvedTheme(
  request: Request,
): Promise<"light" | "dark"> {
  const theme = await getThemeFromRequest(request);

  if (theme === "light" || theme === "dark") {
    return theme;
  }

  // Theme is 'system', check the hint cookie
  const cookieHeader = request.headers.get("Cookie");
  const hint = await themeHintCookie.parse(cookieHeader);

  // Return the hint if valid, otherwise default to light
  return hint === "dark" ? "dark" : "light";
}
