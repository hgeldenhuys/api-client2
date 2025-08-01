#!/usr/bin/env python3
"""
API Client CORS Proxy Server (Python)

A lightweight proxy server to bypass CORS restrictions during API development.
Uses only Python standard library - no external dependencies required.
"""

import asyncio
import base64
import json
import argparse
import sys
import urllib.parse
import urllib.request
import urllib.error
import ssl
from http.server import HTTPServer, BaseHTTPRequestHandler
from http import HTTPStatus
import time

class ProxyConfig:
    def __init__(self):
        self.port = 9090
        self.host = '0.0.0.0'
        self.cors_origin = '*'
        self.username = None
        self.password = None
        self.ssl_verification = 'default'
        self.verbose = False

config = ProxyConfig()

class CORSProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        if config.verbose:
            super().log_message(format, *args)
    
    def check_auth(self):
        """Check basic authentication if configured"""
        if not config.username or not config.password:
            return True
        
        auth_header = self.headers.get('Proxy-Authorization') or self.headers.get('Authorization')
        if not auth_header:
            return False
        
        try:
            auth_type, credentials = auth_header.split(' ', 1)
            if auth_type.lower() != 'basic':
                return False
            
            decoded = base64.b64decode(credentials).decode('utf-8')
            username, password = decoded.split(':', 1)
            
            return username == config.username and password == config.password
        except:
            return False
    
    def send_cors_headers(self):
        """Add CORS headers to response"""
        origin = self.headers.get('Origin', '*')
        
        if config.cors_origin == '*':
            self.send_header('Access-Control-Allow-Origin', origin)
        elif isinstance(config.cors_origin, list):
            if origin in config.cors_origin:
                self.send_header('Access-Control-Allow-Origin', origin)
        else:
            self.send_header('Access-Control-Allow-Origin', config.cors_origin)
        
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Max-Age', '86400')
    
    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        self.handle_request()
    
    def do_POST(self):
        self.handle_request()
    
    def do_PUT(self):
        self.handle_request()
    
    def do_DELETE(self):
        self.handle_request()
    
    def do_PATCH(self):
        self.handle_request()
    
    def do_HEAD(self):
        self.handle_request()
    
    def handle_request(self):
        """Handle all HTTP methods"""
        # Handle health check
        if self.path == '/health':
            self.send_response(HTTPStatus.OK)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            
            health_data = {
                'status': 'ok',
                'version': '1.0.0',
                'uptime': time.time() - start_time
            }
            self.wfile.write(json.dumps(health_data).encode())
            return
        
        # Check authentication
        if not self.check_auth():
            self.send_response(HTTPStatus.UNAUTHORIZED)
            self.send_header('WWW-Authenticate', 'Basic realm="Proxy"')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b'Unauthorized')
            return
        
        # Extract target URL
        target_url = self.headers.get('X-Target-URL')
        if not target_url:
            # Check query parameter
            parsed_path = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_path.query)
            target_url = query_params.get('url', [None])[0]
        
        if not target_url:
            self.send_response(HTTPStatus.BAD_REQUEST)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b'Missing target URL. Use X-Target-URL header or ?url= parameter')
            return
        
        try:
            # Prepare request
            req = urllib.request.Request(target_url, method=self.command)
            
            # Copy headers
            skip_headers = {
                'host', 'connection', 'proxy-authorization',
                'x-target-url', 'origin', 'referer'
            }
            
            for header, value in self.headers.items():
                if header.lower() not in skip_headers:
                    req.add_header(header, value)
            
            # Add body if present
            content_length = self.headers.get('Content-Length')
            if content_length:
                body = self.rfile.read(int(content_length))
                req.data = body
            
            # Handle SSL verification
            if config.ssl_verification == 'ignore':
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
            else:
                ssl_context = None
            
            # Make request
            if config.verbose:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {self.command} {target_url}")
            
            response = urllib.request.urlopen(req, context=ssl_context)
            
            # Send response
            self.send_response(response.code)
            
            # Copy response headers
            for header, value in response.headers.items():
                if header.lower() not in ('connection', 'transfer-encoding'):
                    self.send_header(header, value)
            
            self.send_cors_headers()
            self.end_headers()
            
            # Copy response body
            while True:
                chunk = response.read(8192)
                if not chunk:
                    break
                self.wfile.write(chunk)
            
            if config.verbose:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {self.command} {target_url} -> {response.code}")
                
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            
            # Copy error response headers
            for header, value in e.headers.items():
                if header.lower() not in ('connection', 'transfer-encoding'):
                    self.send_header(header, value)
            
            self.send_cors_headers()
            self.end_headers()
            
            # Copy error body
            self.wfile.write(e.read())
            
            if config.verbose:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {self.command} {target_url} -> {e.code}")
                
        except Exception as e:
            self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            
            error_data = {
                'error': 'Proxy error',
                'message': str(e)
            }
            self.wfile.write(json.dumps(error_data).encode())
            
            if config.verbose:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {self.command} {target_url} -> 500 (Error: {e})")

def main():
    parser = argparse.ArgumentParser(description='API Client CORS Proxy Server')
    parser.add_argument('-p', '--port', type=int, default=9090, help='Port to listen on (default: 9090)')
    parser.add_argument('-H', '--host', default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--origin', default='*', help='CORS origin(s) to allow (default: *)')
    parser.add_argument('-u', '--username', help='Basic auth username')
    parser.add_argument('--password', help='Basic auth password')
    parser.add_argument('-v', '--verbose', action='store_true', help='Enable verbose logging')
    parser.add_argument('--ssl', choices=['default', 'ignore', 'strict'], default='default',
                       help='SSL verification mode')
    
    args = parser.parse_args()
    
    # Update config
    config.port = args.port
    config.host = args.host
    config.cors_origin = args.origin
    config.username = args.username
    config.password = args.password
    config.ssl_verification = args.ssl
    config.verbose = args.verbose
    
    # Start server
    global start_time
    start_time = time.time()
    
    server = HTTPServer((config.host, config.port), CORSProxyHandler)
    
    print(f"""
🚀 API Client CORS Proxy Server (Python) started!
   
   Listening on: http://{config.host}:{config.port}
   Health check: http://{config.host}:{config.port}/health
   
   Usage:
   - Add X-Target-URL header with the target API URL
   - Or use ?url=<target-url> query parameter
   
   {'🔒 Authentication enabled' if config.username else '🔓 No authentication'}
   {'📝 Verbose logging enabled' if config.verbose else ''}
""")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n👋 Shutting down proxy server...')
        server.shutdown()

if __name__ == '__main__':
    main()