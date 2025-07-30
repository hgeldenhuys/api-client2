# API Client Project - Resume Context

## Project Overview
Modern API Client built with React Router 7, TypeScript, and Tailwind CSS. A Postman-like application for testing and documenting APIs.

## Current Status

### ✅ Phase 1: Core Foundation (COMPLETE)
- Three-pane resizable layout with ShadCN UI
- Zustand stores with Immer (collectionStore, environmentStore, requestStore)
- Postman Collection v2.1 TypeScript types
- Collection Explorer with tree view and folder support
- Request Builder with tabs for multiple requests
- Response Viewer with pretty JSON and test results

### ✅ Phase 2: Advanced Features (COMPLETE)
- Monaco Editor integration with custom {{variable}} syntax highlighting
- Web Worker for sandboxed script execution (30-second timeout)
- PM object API implementation compatible with Postman
- Real HTTP request execution with Fetch API
- Pre-request and test script support
- Variable replacement throughout (URLs, headers, body)
- Authentication support (Bearer, Basic, API Key)

### 📋 Phase 3: Storage & Import/Export (PENDING)
**This is the next major phase to implement**

#### Priority Tasks:
1. **IndexedDB Implementation**
   - Create database schema for collections, environments, history
   - Implement encryption layer using WebCrypto API
   - Add migration support for schema updates
   - Auto-save collections on changes

2. **Import Functionality**
   - Postman Collection v2.1 JSON import
   - OpenAPI 3.0/3.1 to Postman converter
   - HAR file import
   - cURL command parser
   - Validation and sanitization

3. **Export Functionality**
   - Export collections as Postman JSON
   - Export with/without sensitive data
   - Export individual requests as cURL
   - Export test results

4. **Security Implementation**
   - AES-GCM encryption for sensitive fields
   - PBKDF2 key derivation from user password
   - Secure storage for API keys and tokens
   - Field-level encryption options

### 🔮 Phase 4: Performance & Polish (FUTURE)
- React-window for virtualizing large collections
- Code generation for multiple languages
- WebSocket support
- Command palette (Cmd+K)
- Keyboard shortcuts
- Theme customization

## Key Files and Locations

### Core Components
- `app/components/layout/MainLayout.tsx` - Three-pane resizable layout
- `app/components/CollectionExplorer.tsx` - Left panel with collection tree
- `app/components/RequestBuilder.tsx` - Center panel with request configuration
- `app/components/ResponseViewer.tsx` - Right panel with response display
- `app/components/MonacoEditor.tsx` - Custom Monaco wrapper with PM support

### State Management
- `app/stores/collectionStore.ts` - Collections and folder management
- `app/stores/environmentStore.ts` - Variables with persistence
- `app/stores/requestStore.ts` - Active request and response state

### Services
- `app/services/requestExecutor.ts` - HTTP request execution
- `app/services/scriptExecutor.ts` - Script execution management
- `app/workers/scriptWorker.ts` - Sandboxed script execution

### Types
- `app/types/postman.ts` - Complete Postman Collection v2.1 types
- `app/types/request.ts` - Application-specific types

## Current Issues/Limitations

1. **No Persistence**: Collections are lost on page refresh (except environments)
2. **No Import/Export**: Can't load existing Postman collections
3. **Limited Auth**: Only Basic, Bearer, and API Key implemented
4. **No Form Data**: Only raw JSON body supported
5. **No Proxy**: Direct requests only
6. **No Cookies**: Cookie jar not implemented

## Technical Decisions Made

1. **Zustand over Redux**: Simpler API, better TypeScript support
2. **Immer for Immutability**: Cleaner state updates
3. **Web Workers for Scripts**: Security through isolation
4. **Monaco Editor**: Best code editing experience
5. **ShadCN UI**: Consistent, accessible components
6. **Bun Runtime**: Faster development experience

## Environment Setup
- React Router 7 with SSR enabled
- TypeScript with strict mode
- Tailwind CSS v4 with ShadCN UI
- Vite for building
- Bun for package management

## Testing the Current Implementation

1. Start dev server: `bun run dev`
2. Demo collection auto-loads with test scripts
3. Click "Get Users" request
4. Check "Tests" tab for pre-written tests
5. Send request and view test results
6. Try switching between requests - editors update correctly

## Next Implementation Steps

### Immediate Priority (Phase 3 Start):
1. Design IndexedDB schema
2. Create storage service with encryption
3. Implement collection auto-save
4. Add import dialog UI
5. Build Postman JSON parser/validator

### Code Structure for Storage:
```typescript
// app/services/storage/schema.ts
interface DBSchema {
  collections: {
    key: string;
    value: CollectionWithMetadata;
    indexes: { 'by-name': string };
  };
  environments: {
    key: string;
    value: Environment;
  };
  history: {
    key: string;
    value: RequestExecution;
    indexes: { 'by-request': string; 'by-date': number };
  };
}

// app/services/storage/encryption.ts
class EncryptionService {
  async encrypt(data: string, key: CryptoKey): Promise<string>
  async decrypt(data: string, key: CryptoKey): Promise<string>
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey>
}
```

## Sub-Agents Created
1. **api-client-context** - Architecture and state management expert
2. **postman-collection-expert** - Postman format specialist
3. **monaco-script-executor** - Script execution expert
4. **storage-security-specialist** - Phase 3 storage implementation
5. **test-suite-developer** - Testing specialist

## Important Context
- All HTTP requests work with real APIs
- Scripts execute in sandboxed Web Workers
- Monaco Editor has custom language for {{variables}}
- PM object is Postman-compatible
- Environment variables persist in localStorage
- Demo collection includes working test examples

## PRD Location
Full Product Requirements Document: `/Users/hgeldenhuys/WebstormProjects/api-client/spec.md`

---

Last updated: 2025-07-28
Phase 2 completed, ready for Phase 3 implementation.