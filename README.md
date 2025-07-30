# Modern API Client

A modern, browser-based API client built with React Router 7, TypeScript, and Tailwind CSS. Inspired by Postman, this application provides a powerful interface for testing and documenting APIs.

## Features

### Core Functionality
- 🚀 **Three-Pane Layout**: Resizable panels for collections, request builder, and response viewer
- 📁 **Collection Management**: Organize requests in folders with Postman Collection v2.1 support
- 🔄 **State Management**: Zustand with Immer for optimal performance
- 🎨 **Modern UI**: Built with ShadCN UI components and Tailwind CSS
- 💾 **Secure Storage**: Browser-based storage with encryption support (coming soon)

### Request Builder
- Multiple HTTP methods (GET, POST, PUT, PATCH, DELETE, etc.)
- Headers management with key-value pairs
- Request body support (JSON, form data, raw)
- Environment variables with {{variable}} syntax
- Tab-based interface for multiple requests

### Response Viewer
- Pretty-printed JSON responses
- Response headers display
- Status codes with color coding
- Response time and size metrics
- Test results display (coming soon)

## Tech Stack

- **Framework**: React Router 7 with TypeScript
- **Styling**: Tailwind CSS v4 + ShadCN UI
- **State Management**: Zustand + Immer
- **Runtime**: Bun
- **Build Tool**: Vite

## Getting Started

### Prerequisites
- Bun installed on your system
- Node.js 18+ (for compatibility)

### Installation

```bash
# Install dependencies
bun install
```

### Development

```bash
# Start the development server
bun run dev
```

Your application will be available at `http://localhost:5173`.

### Type Checking

```bash
# Run TypeScript type checking
bun run typecheck
```

### Building for Production

```bash
# Create a production build
bun run build

# Start the production server
bun run start
```

## Project Structure

```
app/
├── components/          # React components
│   ├── layout/         # Layout components
│   ├── ui/            # ShadCN UI components
│   ├── CollectionExplorer.tsx
│   ├── RequestBuilder.tsx
│   └── ResponseViewer.tsx
├── stores/            # Zustand stores
│   ├── collectionStore.ts
│   ├── environmentStore.ts
│   └── requestStore.ts
├── types/             # TypeScript types
│   ├── postman.ts     # Postman Collection types
│   └── request.ts     # Application types
├── utils/             # Utility functions
└── routes/           # React Router routes
```

## Roadmap

### Phase 1 (Completed) ✅
- Core state management with Zustand
- Three-pane resizable layout
- Basic request/response functionality
- Collection explorer with tree view
- Request builder with tabs

### Phase 2 (In Progress)
- Monaco Editor integration
- Web Worker script execution
- Environment variables system
- Authentication support

### Phase 3 (Planned)
- IndexedDB with encryption
- Import/Export (Postman, OpenAPI, HAR)
- Pre-request and test scripts
- WebSocket support

### Phase 4 (Future)
- Performance optimizations
- Code generation
- Team collaboration features
- Cloud sync capabilities

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

---

Built with ❤️ using React Router, Bun, and modern web technologies.