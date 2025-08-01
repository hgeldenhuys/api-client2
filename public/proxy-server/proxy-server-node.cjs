#!/usr/bin/env node

/**
 * API Client CORS Proxy Server (Node.js)
 * 
 * A lightweight proxy server to bypass CORS restrictions during API development.
 * Supports authentication, HTTPS, and all HTTP methods with comprehensive logging.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const DEFAULT_CONFIG = {
  port: 9090,
  host: '0.0.0.0',
  corsOrigin: '*',
  sslVerification: 'default',
  verbose: false
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
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
        config.sslVerification = args[++i];
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
API Client CORS Proxy Server (Node.js)

Usage: node proxy-server-node.js [options]

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
  node proxy-server-node.js

  # With authentication
  node proxy-server-node.js -u admin --password secret

  # Custom port and verbose mode
  node proxy-server-node.js -p 8888 -v
`);
}

// Merge configurations
const config = { ...DEFAULT_CONFIG, ...parseArgs() };

// Basic auth check
function checkAuth(headers) {
  if (!config.username || !config.password) return { valid: true };
  
  const auth = headers['proxy-authorization'] || headers['authorization'];
  if (!auth) return { valid: false, reason: 'Missing authentication' };
  
  try {
    const [type, credentials] = auth.split(' ');
    if (type !== 'Basic') return { valid: false, reason: 'Invalid auth type' };
    
    const decoded = Buffer.from(credentials, 'base64').toString();
    const [user, pass] = decoded.split(':');
    
    const valid = user === config.username && pass === config.password;
    return { valid, reason: valid ? null : 'Invalid credentials' };
  } catch (error) {
    return { valid: false, reason: 'Auth parsing error' };
  }
}

// Add CORS headers
function addCorsHeaders(headers, origin) {
  const corsHeaders = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, CONNECT, TRACE',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  // Handle origin - always allow the requesting origin for maximum compatibility
  if (config.corsOrigin === '*') {
    corsHeaders['Access-Control-Allow-Origin'] = origin || '*';
  } else if (Array.isArray(config.corsOrigin)) {
    if (origin && config.corsOrigin.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    } else {
      corsHeaders['Access-Control-Allow-Origin'] = '*';
    }
  } else {
    corsHeaders['Access-Control-Allow-Origin'] = config.corsOrigin;
  }

  return { ...headers, ...corsHeaders };
}

// Log request if verbose
function logRequest(method, url, status) {
  if (!config.verbose) return;
  
  const timestamp = new Date().toISOString();
  if (status !== undefined) {
    console.log(`[${timestamp}] ${method} ${url} -> ${status}`);
  } else {
    console.log(`[${timestamp}] ${method} ${url}`);
  }
}

// Make HTTP/HTTPS request
function makeRequest(targetUrl, options) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method,
      headers: options.headers,
      timeout: 30000, // 30 second timeout
    };

    // SSL verification handling
    if (isHttps && config.sslVerification === 'ignore') {
      requestOptions.rejectUnauthorized = false;
    }

    if (config.verbose) {
      console.log('Making request:', {
        url: targetUrl,
        method: options.method,
        headers: options.headers
      });
    }

    const req = client.request(requestOptions, (res) => {
      let data = Buffer.alloc(0);
      
      res.on('data', (chunk) => {
        data = Buffer.concat([data, chunk]);
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    // Send body if present
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Create server
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  
  // Add CORS headers to all responses
  const corsHeaders = addCorsHeaders({}, origin);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Handle health check
    if (req.url === '/health') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        status: 'ok', 
        version: '1.0.0',
        uptime: process.uptime()
      }));
      return;
    }

    // Check authentication
    const authResult = checkAuth(req.headers);
    if (!authResult.valid) {
      console.log('Authentication failed:', authResult.reason);
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="Proxy"');
      res.end('Unauthorized');
      return;
    }

    // Extract target URL
    const targetUrl = req.headers['x-target-url'] || new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
    
    // Enhanced debugging for missing URL issue
    if (config.verbose) {
      console.log('Proxy request debug:', {
        method: req.method,
        url: req.url,
        hasXTargetURL: !!req.headers['x-target-url'],
        xTargetURLValue: req.headers['x-target-url'],
        hasUrlParam: !!new URL(req.url, `http://${req.headers.host}`).searchParams.get('url'),
        urlParamValue: new URL(req.url, `http://${req.headers.host}`).searchParams.get('url'),
        allHeaders: req.headers
      });
    }
    
    if (!targetUrl) {
      console.error('Missing target URL in proxy request');
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Missing target URL. Use X-Target-URL header or ?url= parameter');
      return;
    }

    logRequest(req.method, targetUrl);

    // Prepare headers for target request
    const targetHeaders = {};
    const skipHeaders = [
      'host', 'connection', 'proxy-authorization', 
      'x-target-url', 'origin', 'referer', 'content-length'
    ];
    
    Object.entries(req.headers).forEach(([key, value]) => {
      if (!skipHeaders.includes(key.toLowerCase())) {
        targetHeaders[key] = value;
      }
    });

    // Get request body
    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise((resolve) => {
        let data = Buffer.alloc(0);
        req.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });
        req.on('end', () => {
          resolve(data);
        });
      });
    }

    // Make the request
    const targetResponse = await makeRequest(targetUrl, {
      method: req.method,
      headers: targetHeaders,
      body: body
    });

    logRequest(req.method, targetUrl, targetResponse.status);

    // Set response status and headers
    res.statusCode = targetResponse.status;
    res.statusMessage = targetResponse.statusText;
    
    // Copy response headers and add CORS
    Object.entries(targetResponse.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Re-apply CORS headers (they might have been overwritten)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Send response data
    res.end(targetResponse.data);

  } catch (error) {
    console.error('Proxy error:', error.message);
    logRequest(req.method, req.headers['x-target-url'] || 'unknown', 500);
    
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Proxy error', 
      message: error.message 
    }));
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Start server
server.listen(config.port, config.host, () => {
  console.log(`
🚀 API Client CORS Proxy Server (Node.js) started!
   
   Listening on: http://${config.host}:${config.port}
   Health check: http://${config.host}:${config.port}/health
   
   Usage:
   - Add X-Target-URL header with the target API URL
   - Or use ?url=<target-url> query parameter
   
   ${config.username ? '🔒 Authentication enabled' : '🔓 No authentication'}
   ${config.verbose ? '📝 Verbose logging enabled' : ''}
`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down proxy server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down proxy server...');
  server.close(() => {
    process.exit(0);
  });
});