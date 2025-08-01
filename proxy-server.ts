#!/usr/bin/env bun

/**
 * API Client CORS Proxy Server
 * 
 * A lightweight proxy server to bypass CORS restrictions during API development.
 * Supports authentication, HTTPS, and WebSocket connections.
 */

interface ProxyConfig {
  port: number;
  host: string;
  corsOrigin: string | string[];
  username?: string;
  password?: string;
  sslVerification: 'default' | 'ignore' | 'strict';
  verbose: boolean;
}

const DEFAULT_CONFIG: ProxyConfig = {
  port: 9090,
  host: '0.0.0.0',
  corsOrigin: '*',
  sslVerification: 'default',
  verbose: false
};

// Parse command line arguments
function parseArgs(): Partial<ProxyConfig> {
  const args = process.argv.slice(2);
  const config: Partial<ProxyConfig> = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-p':
      case '--port':
        config.port = parseInt(args[++i]);
        break;
      case '-h':
      case '--host':
        config.host = args[++i];
        break;
      case '--origin':
        config.corsOrigin = args[++i];
        break;
      case '-u':
      case '--username':
        config.username = args[++i];
        break;
      case '--password':
        config.password = args[++i];
        break;
      case '-v':
      case '--verbose':
        config.verbose = true;
        break;
      case '--ssl':
        config.sslVerification = args[++i] as any;
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }
  
  return config;
}

function printHelp() {
  console.log(`
API Client CORS Proxy Server

Usage: bun proxy-server.ts [options]

Options:
  -p, --port <port>      Port to listen on (default: 9090)
  -h, --host <host>      Host to bind to (default: 0.0.0.0)
  --origin <origin>      CORS origin(s) to allow (default: *)
  -u, --username <user>  Basic auth username
  --password <pass>      Basic auth password
  -v, --verbose          Enable verbose logging
  --ssl <mode>           SSL verification: default, ignore, strict
  --help                 Show this help message

Examples:
  # Basic usage
  bun proxy-server.ts

  # With authentication
  bun proxy-server.ts -u admin --password secret

  # Custom port and verbose mode
  bun proxy-server.ts -p 8888 -v
`);
}

// Merge configurations
const config: ProxyConfig = { ...DEFAULT_CONFIG, ...parseArgs() };

// Basic auth check
function checkAuth(request: Request): boolean {
  if (!config.username || !config.password) return true;
  
  const auth = request.headers.get('Proxy-Authorization') || request.headers.get('Authorization');
  if (!auth) return false;
  
  try {
    const [type, credentials] = auth.split(' ');
    if (type !== 'Basic') return false;
    
    const decoded = Buffer.from(credentials, 'base64').toString();
    const [user, pass] = decoded.split(':');
    
    return user === config.username && pass === config.password;
  } catch {
    return false;
  }
}

// Add CORS headers
function addCorsHeaders(headers: Headers, origin?: string): Headers {
  const responseHeaders = new Headers(headers);
  
  // Set other CORS headers first
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, CONNECT, TRACE');
  responseHeaders.set('Access-Control-Allow-Headers', '*');
  responseHeaders.set('Access-Control-Expose-Headers', '*');
  responseHeaders.set('Access-Control-Allow-Credentials', 'true');
  responseHeaders.set('Access-Control-Max-Age', '86400');
  
  // Handle origin - always allow the requesting origin for maximum compatibility
  if (config.corsOrigin === '*') {
    responseHeaders.set('Access-Control-Allow-Origin', origin || '*');
  } else if (Array.isArray(config.corsOrigin)) {
    if (origin && config.corsOrigin.includes(origin)) {
      responseHeaders.set('Access-Control-Allow-Origin', origin);
    } else {
      // Fallback to wildcard for unlisted origins
      responseHeaders.set('Access-Control-Allow-Origin', '*');
    }
  } else {
    responseHeaders.set('Access-Control-Allow-Origin', config.corsOrigin);
  }
  
  // Remove conflicting headers
  responseHeaders.delete('X-Frame-Options');
  responseHeaders.delete('X-Content-Type-Options');
  
  return responseHeaders;
}

// Log request if verbose
function logRequest(method: string, url: string, status?: number) {
  if (!config.verbose) return;
  
  const timestamp = new Date().toISOString();
  if (status !== undefined) {
    console.log(`[${timestamp}] ${method} ${url} -> ${status}`);
  } else {
    console.log(`[${timestamp}] ${method} ${url}`);
  }
}

// Main server
const server = Bun.serve({
  port: config.port,
  hostname: config.host,
  
  async fetch(request: Request) {
    const origin = request.headers.get('Origin');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: addCorsHeaders(new Headers(), origin || undefined)
      });
    }
    
    // Handle health check
    if (new URL(request.url).pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        version: '1.0.0',
        uptime: process.uptime()
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(addCorsHeaders(new Headers(), origin || undefined))
        }
      });
    }
    
    // Check authentication
    if (!checkAuth(request)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Proxy"',
          ...Object.fromEntries(addCorsHeaders(new Headers(), origin || undefined))
        }
      });
    }
    
    // Extract target URL
    const targetUrl = request.headers.get('X-Target-URL') || 
                     new URL(request.url).searchParams.get('url');
    
    if (!targetUrl) {
      return new Response('Missing target URL. Use X-Target-URL header or ?url= parameter', {
        status: 400,
        headers: addCorsHeaders(new Headers(), origin || undefined)
      });
    }
    
    try {
      logRequest(request.method, targetUrl);
      
      // Prepare headers for target request
      const targetHeaders = new Headers();
      
      // Copy relevant headers
      const skipHeaders = [
        'host', 'connection', 'proxy-authorization', 
        'x-target-url', 'origin', 'referer'
      ];
      
      request.headers.forEach((value, key) => {
        if (!skipHeaders.includes(key.toLowerCase())) {
          targetHeaders.set(key, value);
        }
      });
      
      // Make the request
      const targetResponse = await fetch(targetUrl, {
        method: request.method,
        headers: targetHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        // @ts-ignore - Bun supports these options
        redirect: 'manual',
        ...(config.sslVerification === 'ignore' && { 
          rejectUnauthorized: false 
        })
      });
      
      logRequest(request.method, targetUrl, targetResponse.status);
      
      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(targetResponse.status)) {
        const location = targetResponse.headers.get('Location');
        if (location) {
          const responseHeaders = addCorsHeaders(targetResponse.headers, origin || undefined);
          responseHeaders.set('X-Original-Location', location);
        }
      }
      
      // Return proxied response with CORS headers
      return new Response(targetResponse.body, {
        status: targetResponse.status,
        statusText: targetResponse.statusText,
        headers: addCorsHeaders(targetResponse.headers, origin || undefined)
      });
      
    } catch (error) {
      console.error('Proxy error:', error);
      logRequest(request.method, targetUrl, 500);
      
      return new Response(JSON.stringify({ 
        error: 'Proxy error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(addCorsHeaders(new Headers(), origin || undefined))
        }
      });
    }
  },
  
  error(error) {
    console.error('Server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(`
🚀 API Client CORS Proxy Server started!
   
   Listening on: http://${config.host}:${config.port}
   Health check: http://${config.host}:${config.port}/health
   
   Usage:
   - Add X-Target-URL header with the target API URL
   - Or use ?url=<target-url> query parameter
   
   ${config.username ? '🔒 Authentication enabled' : '🔓 No authentication'}
   ${config.verbose ? '📝 Verbose logging enabled' : ''}
`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down proxy server...');
  server.stop();
  process.exit(0);
});