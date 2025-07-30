# Testing the API Client

## How to Test the New Features

1. **Start the Development Server**:
   ```bash
   bun run dev
   ```

2. **Test Script Execution**:
   - The demo collection already has a "Get Users" request with test scripts
   - Click on "Get Users" in the collection explorer
   - Go to the "Tests" tab to see the pre-written test script
   - Click "Send" to execute the request
   - After the response, click on "Test Results" tab to see:
     - ✓ Status is 200
     - ✓ Response is an array
     - ✓ Response has users

3. **Test Monaco Editor Updates**:
   - Switch between different requests in the collection
   - Notice that the content in all editors (Body, Pre-request Script, Tests) updates correctly
   - The editors now properly show the content for each specific request

4. **Write Your Own Tests**:
   - Select any request
   - Go to the "Tests" tab
   - Write a test script, for example:
     ```javascript
     pm.test('Response time is less than 1000ms', () => {
       pm.expect(pm.response.responseTime).to.be.below(1000);
     });
     ```
   - Send the request and check the Test Results tab

5. **Use Environment Variables**:
   - In the request URL or headers, use `{{variableName}}`
   - The Monaco Editor will provide auto-completion for variables
   - Variables are highlighted in orange in the editor

## Fixed Issues

1. ✅ Test results now properly display in the Response Viewer
2. ✅ Monaco Editor content updates when switching between requests
3. ✅ Scripts are properly passed to the request executor
4. ✅ Test execution works with the sandboxed Web Worker

## What's Working

- Real HTTP requests with response display
- Pre-request and test script execution
- Monaco Editor with syntax highlighting and auto-completion
- Sandboxed script execution for security
- Test results display with pass/fail status
- Console output from scripts
- Variable replacement in URLs, headers, and body

Enjoy testing your APIs with the new scripting capabilities!