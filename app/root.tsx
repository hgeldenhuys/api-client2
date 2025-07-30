import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import { getThemeFromRequest, getResolvedTheme } from "~/cookies/theme.server";
import "./utils/monacoConfig"; // Configure Monaco Editor to use local assets
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request }: { request: Request }) {
  const theme = await getThemeFromRequest(request);
  const resolvedTheme = await getResolvedTheme(request);
  return { theme, resolvedTheme };
}

export function headers() {
  return {
    "Content-Security-Policy": [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com https://cdnjs.cloudflare.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `connect-src 'self' *`, // Allow API calls to any domain for API client functionality
      `img-src 'self' data: blob:`,
      `media-src 'self'`,
      `object-src 'none'`,
      `worker-src 'self' data:`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`
    ].join('; '),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY", 
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
  };
}

function getThemeClass(resolvedTheme?: 'light' | 'dark'): string {
  return resolvedTheme === 'dark' ? 'dark' : '';
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData("root") as { theme: 'light' | 'dark' | 'system'; resolvedTheme: 'light' | 'dark' } | undefined;
  
  // Apply both theme attribute and resolved class for proper SSR
  return (
    <html lang="en" data-theme={data?.theme ?? 'system'} className={getThemeClass(data?.resolvedTheme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Apply theme and set hint cookie for SSR */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = document.documentElement.getAttribute('data-theme') || 'system';
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                
                // Set hint cookie for system theme
                if (theme === 'system') {
                  const hint = systemDark ? 'dark' : 'light';
                  document.cookie = 'theme-hint=' + hint + '; path=/; max-age=31536000; samesite=lax';
                }
                
                // Listen for system theme changes
                if (theme === 'system') {
                  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
                    const newHint = e.matches ? 'dark' : 'light';
                    document.cookie = 'theme-hint=' + newHint + '; path=/; max-age=31536000; samesite=lax';
                    
                    // Update class
                    if (e.matches) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
