# Manual Test: Pre-request Script Request Modification

## Test Steps

1. **Start the development server**
   ```bash
   bun run dev
   ```

2. **Open the application**
   - Navigate to http://localhost:5173

3. **Create a new collection**
   - Click "New Collection" button
   - Enter name: "Request Modification Test"
   - Click "Create Collection"

4. **Add a new request**
   - Click the "+" button next to the collection
   - Enter name: "Header Modification Test"
   - Click "Add"

5. **Configure the request**
   - URL: `https://httpbin.org/headers`
   - Method: GET (default)

6. **Add pre-request script**
   - Click on "Pre-request Script" tab
   - Click "Examples" dropdown
   - Select "Modify Request Headers"
   - The following script should be inserted:
   ```javascript
   // Add authentication header
   const token = pm.environment.get('authToken') || 'your-api-token';
   pm.request.addHeader('Authorization', `Bearer ${token}`);

   // Add custom headers
   pm.request.addHeader('X-API-Version', 'v2');
   pm.request.addHeader('X-Request-ID', Date.now().toString());

   // Remove a header if needed
   // pm.request.removeHeader('User-Agent');
   ```

7. **Send the request**
   - Click "Send" button

8. **Verify the response**
   - The response should show the headers echoed back by httpbin
   - You should see:
     - `"Authorization": "Bearer your-api-token"`
     - `"X-API-Version": "v2"`
     - `"X-Request-ID": "<timestamp>"`

## Additional Tests

### Test URL Modification
1. Create a new request
2. Set URL to `https://httpbin.org/get`
3. Add pre-request script:
   ```javascript
   // Change the URL
   pm.request.setUrl('https://httpbin.org/user-agent');
   console.log('URL changed to:', pm.request.url);
   ```
4. Send request - should get user-agent response instead of GET response

### Test Body Modification
1. Create a new request
2. Set method to POST
3. Set URL to `https://httpbin.org/post`
4. Set body to: `{"original": "data"}`
5. Add pre-request script:
   ```javascript
   const body = {
     original: "data",
     modified: true,
     timestamp: Date.now()
   };
   pm.request.setBody(JSON.stringify(body));
   pm.request.addHeader('Content-Type', 'application/json');
   ```
6. Send request - response should echo the modified body

## Expected Results
- Pre-request scripts should be able to:
  - Add/modify headers using `pm.request.addHeader()`
  - Remove headers using `pm.request.removeHeader()`
  - Change the URL using `pm.request.setUrl()`
  - Modify the request body using `pm.request.setBody()`
  - All modifications should be applied before the request is sent