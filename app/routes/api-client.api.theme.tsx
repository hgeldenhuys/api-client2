import { data } from "react-router";
import { setThemeCookie, type ThemeMode } from "~/cookies/theme.server";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const theme = formData.get("theme") as ThemeMode;
  
  // Validate theme value
  if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
    throw new Response("Invalid theme", { status: 400 });
  }
  
  // Set the theme cookie
  const cookieHeader = await setThemeCookie(theme);
  
  // Return JSON response instead of redirecting
  return data(
    { success: true, theme },
    {
      headers: {
        "Set-Cookie": cookieHeader,
      },
    }
  );
}