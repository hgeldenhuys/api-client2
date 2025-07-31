# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- **Start Development**: `bun run dev` - Starts React Router 7 dev server on port 5173
- **Build Production**: `bun run build` - Creates production build
- **Start Production**: `bun run start` - Runs production build
- **Type Check**: `bun run typecheck` - Runs React Router typegen and TypeScript checks

### Testing Commands
- **Run Tests**: `bun run test` - Run Playwright tests
- **Interactive Tests**: `bun run test:ui` - Open Playwright test UI
- **Debug Tests**: `bun run test:headed` - Run tests with browser visible

## Architecture Overview

### Tech Stack
- **Framework**: React Router 7 (migrated from Remix)
- **Language**: TypeScript
- **Runtime**: Bun
- **Styling**: Tailwind CSS v4 + ShadCN UI components
- **State Management**: Zustand with Immer middleware
- **Code Editor**: Monaco Editor with custom `api-script` language
- **Script Execution**: Web Workers with sandboxed PM API
- **Build Tool**: Vite

### Project Structure
```
app/
├── components/         # React components
│   ├── ui/            # ShadCN UI components
│   ├── layout/        # Layout components (AppLayout, etc.)
│   ├── CollectionExplorer.tsx  # Left pane - collection tree
│   ├── RequestBuilder.tsx      # Center pane - request editor
│   ├── ResponseViewer.tsx      # Right pane - response display
│   └── MonacoEditor.tsx        # Enhanced Monaco with PM API support
├── stores/            # Zustand stores with Immer
│   ├── collectionStore.ts      # Collection/folder/request management
│   ├── requestStore.ts         # Active request state & execution
│   ├── environmentStore.ts     # Variables & environments
│   ├── authStore.ts            # Authentication caching
│   └── proxyStore.ts           # CORS proxy configuration
├── services/          # Core business logic
│   ├── requestExecutor.ts      # HTTP request execution engine
│   ├── scriptExecutor.ts       # Pre-request/test script runner
│   ├── variableResolver.ts     # {{variable}} resolution
│   └── import-export/          # Postman collection import/export
├── workers/           # Web Workers
│   └── scriptWorker.ts         # Sandboxed script execution
├── types/             # TypeScript definitions
│   ├── postman.ts              # Postman Collection v2.1 types
│   ├── request.ts              # Application request types
│   └── script.ts               # PM API types
└── utils/             # Utility functions
```

### Key Architectural Patterns

#### 1. State Management
- Uses Zustand with Immer for immutable updates
- Each store is focused on a specific domain
- Stores can read from other stores but avoid circular dependencies

#### 2. Script Execution Flow
```
RequestBuilder → scriptExecutor → Web Worker → PM API → Response
                                      ↓
                                 Sandboxed Environment
```

#### 3. Variable Resolution
- Variables are resolved in order: Collection → Environment → Global
- Supports {{variable}} syntax throughout the application
- Variables can be used in URLs, headers, body, and auth

#### 4. Request Execution Pipeline
1. Pre-request script execution (if present)
2. Variable resolution
3. Authentication processing
4. HTTP request via fetch or proxy
5. Response processing
6. Test script execution (if present)

#### 5. Monaco Editor Integration
- Custom `api-script` language for PM API syntax highlighting
- Auto-completion for `pm.request`, `pm.response`, and other PM APIs
- Real-time error detection for script syntax

### Critical Implementation Details

#### CORS Handling
- Automatic CORS error detection
- Built-in proxy support via `proxyStore`
- Proxy routes requests through server to bypass CORS

#### Authentication
- Supports Bearer, Basic, API Key, JWT, OAuth2, and custom auth
- Auth credentials are cached per request in `authStore`
- OAuth2 tokens are stored and reused automatically

#### Script Sandboxing
- Scripts run in Web Workers for isolation
- PM API is injected into worker context
- No access to DOM or external resources
- Console output is captured and displayed

#### Storage Architecture (Phase 3 - Planned)
- IndexedDB for local storage
- Encryption via Web Crypto API
- Collections, environments, and history will be encrypted

### PM API Implementation

The PM (Postman) API is implemented in the Web Worker context:

```javascript
pm = {
  request: {
    url: string,
    method: string,
    headers: { get(), add(), remove() },
    body: { raw }
  },
  response: {
    status: number,
    statusText: string,
    headers: { get() },
    json(): any,
    text(): string,
    time: number
  },
  environment: {
    get(key): string,
    set(key, value): void,
    unset(key): void
  },
  collectionVariables: {
    get(key): string,
    set(key, value): void
  },
  globals: {
    get(key): string,
    set(key, value): void
  },
  test(name, fn): void,
  expect(value): ChaiAssertion
}
```

### Important Considerations

1. **React Router 7 Migration**: All Remix imports have been replaced with React Router 7 equivalents
2. **Theme Switching**: Uses `useFetcher` for smooth theme toggling without page reloads
3. **Type Safety**: Strict TypeScript with comprehensive type definitions
4. **Performance**: Heavy use of memoization and lazy loading
5. **Security**: Scripts are sandboxed, no eval() usage, XSS protection

### CLOUDIOS Integration

The project includes CLOUDIOS integration for audio summaries:
- Always include `<audio>` tags at the end of responses
- Audio plays in the Hermes terminal, not the browser
- See existing CLOUDIOS documentation in this file for details

### Running Tests

Tests use Playwright and focus on:
- Parameter handling and focus management
- Script execution and PM API functionality
- Request modification via pre-request scripts
- Security (XSS protection)

Run specific test: `bun test tests/script-functionality.test.ts`