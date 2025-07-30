# Auto-Save Implementation for Request Builder

## Problem
Request edits were being lost when switching between requests because the RequestBuilder component was only using local state without persisting changes back to the collection store.

## Solution
Implemented auto-save functionality with the following features:

### 1. Debounced Auto-Save
- Added a custom `useDebounce` hook that delays saves by 1 second
- Prevents excessive saves while typing
- Automatically saves all request fields:
  - Method (GET, POST, PUT, etc.)
  - URL
  - Headers
  - Body content and mode
  - Pre-request scripts
  - Test scripts

### 2. Intelligent Save Logic
- Only saves when there's an active collection and request
- Prevents auto-save during initial request load (using `isInitialLoad` flag)
- Preserves the complete request structure including events

### 3. Storage Integration
- Updates are sent to the collection store via `updateRequest`
- Collection store automatically persists to IndexedDB (with its own 1-second debounce)
- Total save delay: ~2 seconds from last edit

## How It Works

1. **User edits a request field** → Local state updates immediately
2. **After 1 second of no changes** → `debouncedSave` triggers
3. **Save function** → Constructs complete request object and calls `updateRequest`
4. **Collection store** → Updates in-memory state and triggers IndexedDB save
5. **IndexedDB** → Persists data after another 1-second debounce

## Code Changes

### RequestBuilder.tsx
```typescript
// Added debounce utility
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T

// Added auto-save state
const [isInitialLoad, setIsInitialLoad] = React.useState(true);

// Save function that constructs complete request
const saveRequest = React.useCallback(() => {
  // Builds request with all fields including scripts
  updateRequest(activeCollectionId, activeRequestId, updatedRequest);
}, [...dependencies]);

// Auto-save effect
React.useEffect(() => {
  if (activeCollectionId && activeRequestId && !isInitialLoad) {
    debouncedSave();
  }
}, [all request fields]);
```

## Testing
1. Edit any request field (URL, headers, body, etc.)
2. Switch to another request
3. Switch back - all changes should be preserved
4. Refresh the page - changes should persist (thanks to IndexedDB)

## Future Improvements
- Add visual indicator when saving
- Add "unsaved changes" warning when closing tab with pending saves
- Add manual save button for immediate saves
- Add undo/redo functionality