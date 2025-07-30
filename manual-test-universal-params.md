# Manual Test: Universal Parameters System

## Test Overview
Verify the Universal Parameters system works correctly with bidirectional synchronization between URL, headers, and body.

## Prerequisites
1. Start the development server: `bun run dev`
2. Navigate to http://localhost:5173

## Test Scenarios

### Test 1: Basic Parameter Creation and Location Management
1. **Create a new collection**
   - Click "New Collection"
   - Name: "Universal Params Test"
   - Click "Create Collection"

2. **Add a new request**
   - Click "+" next to collection
   - Name: "Params Test Request"
   - Click "Add"

3. **Test the Params tab**
   - Click on the request
   - Go to "Params" tab
   - Verify the universal parameters editor is displayed
   - Should show: Parameters Table and Request Preview tabs

### Test 2: URL Query Parameter Synchronization
1. **Enter URL with query parameters**
   - URL: `https://httpbin.org/get?search=test&page=1&enabled=true`
   - Verify query parameters appear in Params tab automatically
   - Should show 3 parameters with location "Query Params"

2. **Add parameter via Params tab**
   - Click "Add Parameter"
   - Key: `filter`, Value: `active`, Location: `Query Params`
   - URL should update to include `&filter=active`

3. **Modify parameter location**
   - Change `search` parameter location to "Headers"
   - URL should update to remove `search` from query string
   - Headers tab should show `search: test`

### Test 3: Header Parameter Management
1. **Add header via Params tab**
   - Add parameter: Key: `Authorization`, Value: `Bearer token123`
   - Location should auto-suggest "Headers"
   - Headers tab should sync automatically

2. **Add API key header**
   - Add parameter: Key: `x-api-key`, Value: `secret123`
   - Should auto-suggest "Headers" location
   - Verify both headers appear in Headers tab

### Test 4: Form Data Parameters
1. **Change request method to POST**
   - Method dropdown: Select "POST"

2. **Add form data parameters**
   - Add parameter: Key: `username`, Value: `testuser`, Location: `Form Data`
   - Add parameter: Key: `email`, Value: `test@example.com`, Location: `Form Data`
   - Body tab should switch to "Form Data" mode

3. **Test Request Preview**
   - Go to Params → Request Preview tab
   - Should show all parameter locations with their values

### Test 5: URL-Encoded Body Parameters
1. **Add URL-encoded parameters**
   - Add parameter: Key: `password`, Value: `secret`, Location: `URL Encoded`
   - Body should switch to URL-encoded format
   - Should show `password=secret` in body

### Test 6: Smart Location Suggestions
1. **Test auto-suggestions**
   - Add parameter with key `token` → should suggest "Headers"
   - Add parameter with key `page` → should suggest "Query Params"
   - Add parameter with key `username` → should suggest "Form Data"

### Test 7: Real Request Execution
1. **Setup test request**
   - URL: `https://httpbin.org/post`
   - Method: POST
   - Add parameters:
     - `search`: `test` (Query Params)
     - `Authorization`: `Bearer test123` (Headers)
     - `username`: `testuser` (URL Encoded)

2. **Send request**
   - Click "Send"
   - Verify response shows:
     - Query parameters in `args`
     - Headers include Authorization
     - Form data in `form` with username

### Test 8: Parameter Validation
1. **Test invalid parameters**
   - Add header with spaces in key name → should show validation error
   - Add very long parameter values → should validate against limits

### Test 9: Bulk Operations
1. **Test bulk actions**
   - Create several parameters
   - Use "Move to..." dropdown to change locations in bulk
   - Use "Enable All" / "Disable All" buttons
   - Filter by location using location dropdown

### Test 10: Data Persistence
1. **Save and reload**
   - Create parameters in different locations
   - Navigate away from request and back
   - Verify all parameters are preserved with correct locations

## Expected Results
- ✅ URL ↔ Query parameters sync bidirectionally
- ✅ Headers ↔ Header parameters sync bidirectionally  
- ✅ Body ↔ Body parameters sync bidirectionally
- ✅ Smart location auto-suggestion works
- ✅ Parameter validation prevents invalid configurations
- ✅ Real requests send parameters to correct locations
- ✅ All data persists correctly when saving/loading requests
- ✅ UI is responsive and intuitive to use

## Troubleshooting
- If parameters don't sync: Check browser console for errors
- If UI doesn't load: Verify all imports are correct
- If validation fails: Check parameter validation rules in `parameterLocations.ts`
- If requests fail: Check Network tab to see actual HTTP request format