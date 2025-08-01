# API Client CORS Proxy Server

A lightweight proxy server to bypass CORS restrictions during API development. Available in multiple languages with zero or minimal dependencies.

## Quick Start

### Using Bun (Recommended)

```bash
bun proxy-server.ts
```

### Using Python

```bash
python3 scripts/proxy.py
```

### Using Go

```bash
go run scripts/proxy.go
```

## Features

- 🚀 **Zero/Minimal Dependencies** - Uses only standard library
- 🔒 **Optional Authentication** - Basic auth support
- 🌐 **CORS Header Injection** - Automatic CORS handling
- 📝 **Request Logging** - Verbose mode for debugging
- 🔄 **WebSocket Support** (Bun version)
- 🎯 **Multiple Target Methods** - Header or query parameter

## Usage

### Basic Usage

1. Start the proxy server:
   ```bash
   bun proxy-server.ts
   ```

2. In your API client, either:
   - Add `X-Target-URL` header with your target API URL
   - Or append `?url=<target-url>` to the proxy URL

### Example Request

```bash
# Using header
curl -H "X-Target-URL: https://api.example.com/data" http://localhost:9090

# Using query parameter
curl http://localhost:9090?url=https://api.example.com/data
```

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port` | Port to listen on | 9090 |
| `-h, --host` | Host to bind to | 0.0.0.0 |
| `--origin` | CORS origin(s) to allow | * |
| `-u, --username` | Basic auth username | (none) |
| `--password` | Basic auth password | (none) |
| `-v, --verbose` | Enable verbose logging | false |
| `--ssl` | SSL verification mode | default |

## Language-Specific Instructions

### Bun/TypeScript

Requires [Bun](https://bun.sh) installed.

```bash
# Run directly
bun proxy-server.ts

# With options
bun proxy-server.ts -p 8080 -v

# Build standalone executable
bun build proxy-server.ts --compile --outfile proxy-server
```

### Python

Works with Python 3.6+, no external dependencies.

```bash
# Run directly
python3 scripts/proxy.py

# With options
python3 scripts/proxy.py -p 8080 --verbose

# Make executable
chmod +x scripts/proxy.py
./scripts/proxy.py
```

### Go

Requires Go 1.16+, no external dependencies.

```bash
# Run directly
go run scripts/proxy.go

# With options
go run scripts/proxy.go -port 8080 -verbose

# Build executable
go build -o proxy-server scripts/proxy.go
./proxy-server
```

## Building Platform Binaries

### Bun (All Platforms)

```bash
# Windows
bun build proxy-server.ts --compile --target=bun-windows-x64 --outfile proxy-server.exe

# macOS
bun build proxy-server.ts --compile --target=bun-darwin-x64 --outfile proxy-server-macos

# Linux
bun build proxy-server.ts --compile --target=bun-linux-x64 --outfile proxy-server-linux
```

### Go (Cross-compilation)

```bash
# Windows
GOOS=windows GOARCH=amd64 go build -o proxy-server.exe scripts/proxy.go

# macOS
GOOS=darwin GOARCH=amd64 go build -o proxy-server-macos scripts/proxy.go

# Linux
GOOS=linux GOARCH=amd64 go build -o proxy-server-linux scripts/proxy.go
```

## Security Considerations

- The proxy server should only be used for development
- Authentication is optional but recommended if exposed
- SSL certificate verification can be disabled for testing
- By default, allows requests from any origin (CORS)

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 9090
lsof -i :9090  # macOS/Linux
netstat -ano | findstr :9090  # Windows

# Use a different port
bun proxy-server.ts -p 8888
```

### CORS Still Blocked

Make sure you're:
1. Sending requests to the proxy URL, not the target API
2. Including the target URL via header or query parameter
3. The proxy server is running and accessible

### Authentication Issues

If using authentication:
```bash
# Start with auth
bun proxy-server.ts -u admin --password secret

# Client must include credentials
curl -u admin:secret -H "X-Target-URL: https://api.example.com" http://localhost:9090
```

## License

MIT