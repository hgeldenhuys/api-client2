# Focus Loss Fix Test

## Issue
When typing in parameter key or value fields, the input would lose focus after the URL sync completed, interrupting the user's typing flow.

## Root Cause
1. URL changes triggered parameter parsing
2. Parameter updates caused component re-renders
3. Re-renders caused input elements to lose focus

## Fixes Applied

### 1. Circular Update Prevention
```typescript
// Added flags to prevent circular updates
const [isUpdatingFromParams, setIsUpdatingFromParams] = React.useState(false);
const [isUpdatingFromUrl, setIsUpdatingFromUrl] = React.useState(false);

// URL sync only when not updating from params
React.useEffect(() => {
  if (!isUrlSyncEnabled || isInitialLoad || isUpdatingFromParams) return;
  // ... URL parsing logic
}, [url, isUrlSyncEnabled, isInitialLoad, isUpdatingFromParams]);

// Params sync only when not updating from URL
const syncUrlFromParams = React.useCallback(() => {
  if (!isUrlSyncEnabled || isUpdatingFromUrl) return;
  // ... URL building logic
}, [url, universalParams, isUrlSyncEnabled, isUpdatingFromUrl]);
```

### 2. Smarter Change Detection
```typescript
// Only update if query params actually changed
const queryParamsChanged = 
  parsed.queryParams.length !== currentQueryParams.length ||
  parsed.queryParams.some((newParam, index) => 
    !currentQueryParams[index] || 
    currentQueryParams[index].key !== newParam.key || 
    currentQueryParams[index].value !== newParam.value
  );

if (queryParamsChanged) {
  // Update params
}
```

### 3. Component Memoization
```typescript
// Memoized main component
export const UniversalParametersEditor = React.memo(function UniversalParametersEditor({ ... }) {

// Memoized row component  
const ParameterRow = React.memo(function ParameterRow({ ... }) {

// Memoized event handlers to prevent re-renders
const handleKeyChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  // ... handle change
}, [parameter.key, onChange]);
```

### 4. Increased Debounce Timing
- Changed from 300ms to 500ms to give users more time to type
- Reduces frequency of URL updates during rapid typing

## Test Steps

1. **Start the development server**
   ```bash
   bun run dev
   ```

2. **Create a test request**
   - Go to http://localhost:5173
   - Create new collection: "Focus Test"
   - Add new request: "Focus Test Request"

3. **Test parameter input focus**
   - Go to Params tab
   - Click "Add Parameter"
   - Start typing in the Key field: "search"
   - Continue typing without pauses
   - ✅ Focus should remain in the Key field
   - Type in Value field: "test query"
   - ✅ Focus should remain in the Value field

4. **Test URL synchronization**
   - Verify URL shows: `?search=test%20query`
   - Add another parameter: key="page", value="1"
   - ✅ URL should update to: `?search=test%20query&page=1`
   - ✅ Both inputs should maintain focus during typing

5. **Test reverse synchronization**
   - Manually edit URL to: `https://example.com/api?filter=active&sort=name`
   - Go to Params tab
   - ✅ Should show 2 parameters: filter=active, sort=name
   - Edit the filter value by typing directly
   - ✅ Focus should not be lost during typing

## Expected Results
- ✅ No focus loss when typing in parameter inputs
- ✅ URL updates smoothly without interrupting user input
- ✅ Bidirectional sync still works correctly
- ✅ No unnecessary re-renders or update loops
- ✅ Debounced updates feel responsive but not jarring

## Success Criteria
- User can type continuously in parameter fields without interruption
- URL synchronization happens smoothly in the background
- No console errors or infinite update loops
- All existing functionality remains intact