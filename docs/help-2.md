# API Client User Documentation

## Table of Contents

1. [Getting Started](#getting-started)
   - [Quick Start](#quick-start)
   - [Interface Overview](#interface-overview)
   - [First Request](#first-request)

2. [Core Features](#core-features)
   - [Making Requests](#making-requests)
   - [Working with Collections](#working-with-collections)
   - [Environment Variables](#environment-variables)
   - [Request Parameters](#request-parameters)

3. [Request Builder](#request-builder)
   - [HTTP Methods](#http-methods)
   - [URL Construction](#url-construction)
   - [Headers](#headers)
   - [Request Body](#request-body)
   - [Authentication](#authentication)

4. [Response Viewer](#response-viewer)
   - [Response Body](#response-body)
   - [Response Headers](#response-headers)
   - [Status Information](#status-information)
   - [Response Actions](#response-actions)

5. [Collections](#collections)
   - [Creating Collections](#creating-collections)
   - [Organizing Requests](#organizing-requests)
   - [Importing Collections](#importing-collections)
   - [Exporting Collections](#exporting-collections)

6. [Variables & Environments](#variables--environments)
   - [Variable Types](#variable-types)
   - [Using Variables](#using-variables)
   - [Managing Environments](#managing-environments)
   - [Variable Scope](#variable-scope)

7. [Scripting](#scripting)
   - [Pre-request Scripts](#pre-request-scripts)
   - [Test Scripts](#test-scripts)
   - [PM API Reference](#pm-api-reference)
   - [Common Script Examples](#common-script-examples)

8. [Advanced Features](#advanced-features)
   - [Code Generation](#code-generation)
   - [Request History](#request-history)
   - [Proxy Configuration](#proxy-configuration)
   - [Keyboard Shortcuts](#keyboard-shortcuts)

9. [Troubleshooting](#troubleshooting)
   - [Common Issues](#common-issues)
   - [CORS Problems](#cors-problems)
   - [Performance Tips](#performance-tips)

10. [FAQ](#faq)

---

## Getting Started

### Quick Start

The API Client is a browser-based tool for testing and documenting REST APIs. No installation is required - simply open the application in your web browser and start making requests.

#### System Requirements
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Internet connection (for making API requests)
- Optional: Proxy server for CORS bypass (included)

### Interface Overview

The API Client uses a three-pane layout:

![API Client Main Interface](./assets/main-interface.png)
*The API Client interface showing the three-pane layout with Collections, Request Builder, and Response Viewer*

```
┌─────────────┬──────────────────┬─────────────┐
│             │                  │             │
│ Collection  │  Request Builder │  Response   │
│  Explorer   │                  │   Viewer    │
│             │                  │             │
│  (Left)     │    (Center)      │   (Right)   │
│             │                  │             │
└─────────────┴──────────────────┴─────────────┘
```

- **Left Pane**: Browse and organize your API collections
- **Center Pane**: Build and configure requests
- **Right Pane**: View responses and test results

All panes are resizable - drag the dividers to adjust the layout to your preference.

### First Request

1. **Enter a URL**: In the center pane, type or paste an API endpoint URL
2. **Select Method**: Choose the HTTP method (GET, POST, etc.) from the dropdown
3. **Click Send**: Press the Send button or use Ctrl/Cmd + Enter
4. **View Response**: Check the response in the right pane

Example:
```
GET https://api.github.com/users/github
```

## Core Features

### Making Requests

![Request Builder Interface](./assets/request-builder.png)
*The Request Builder showing a GET request to the JSONPlaceholder API with headers configuration*

#### Basic Request Flow

1. **Select or Create Request**: Choose from collection or create new
2. **Configure Request**:
   - Set HTTP method
   - Enter URL
   - Add headers (if needed)
   - Add body (for POST/PUT/PATCH)
3. **Send Request**: Click Send or press Ctrl/Cmd + Enter
4. **Analyze Response**: Review status, headers, and body

![Response Viewer](./assets/response-viewer.png)
*The Response Viewer displaying a successful JSON response with syntax highlighting*

#### Request Methods Supported

- **GET**: Retrieve data
- **POST**: Create new resources
- **PUT**: Update entire resources
- **PATCH**: Partially update resources
- **DELETE**: Remove resources
- **HEAD**: Get headers only
- **OPTIONS**: Get allowed methods

### Working with Collections

![Collection Explorer](./assets/collection-explorer.png)
*The Collection Explorer showing organized API requests in folders*

Collections help organize related API requests:

1. **Create Collection**: Click "+" in the collection explorer
2. **Add Folders**: Right-click collection → "Add Folder"
3. **Add Requests**: Right-click folder → "Add Request"
4. **Organize**: Drag and drop to reorder

### Environment Variables

Variables make requests dynamic and reusable:

```
{{base_url}}/api/v1/users
{{auth_token}}
```

### Request Parameters

The Universal Parameters system unifies all parameter types:

![Universal Parameters Editor](./assets/parameters-editor.png)
*The Universal Parameters editor showing different parameter types in a unified interface*

- **Query Parameters**: Added to URL (?key=value)
- **Headers**: HTTP headers
- **Path Variables**: URL path segments (/:id)
- **Form Data**: For file uploads
- **URL Encoded**: Form submissions

## Request Builder

### HTTP Methods

Each method has a specific purpose:

| Method | Purpose | Body Support |
|--------|---------|-------------|
| GET | Retrieve data | No |
| POST | Create resource | Yes |
| PUT | Replace resource | Yes |
| PATCH | Update resource | Yes |
| DELETE | Remove resource | Optional |
| HEAD | Get headers | No |
| OPTIONS | Get capabilities | No |

### URL Construction

#### Basic URL
```
https://api.example.com/v1/users
```

#### With Path Variables
```
https://api.example.com/v1/users/:userId
// Becomes: https://api.example.com/v1/users/123
```

#### With Query Parameters
```
https://api.example.com/v1/users?page=1&limit=10
```

#### With Variables
```
{{base_url}}/users/{{user_id}}?token={{api_token}}
```

### Headers

Common headers:

```
Content-Type: application/json
Authorization: Bearer {{token}}
Accept: application/json
User-Agent: API-Client/1.0
```

#### Adding Headers

1. Go to the "Params" tab
2. Select "Headers" location
3. Enter key-value pairs
4. Enable/disable as needed

### Request Body

#### JSON Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30
}
```

#### Form Data
Used for file uploads:
- Select "form-data" in body type
- Add fields with key-value pairs
- Choose "File" type for file uploads

#### URL Encoded
For traditional form submissions:
```
name=John+Doe&email=john%40example.com
```

### Authentication

#### Bearer Token
```
Authorization: Bearer {{access_token}}
```

#### Basic Auth
```
Authorization: Basic base64(username:password)
```

#### API Key
In header:
```
X-API-Key: {{api_key}}
```

In query:
```
https://api.example.com/data?api_key={{api_key}}
```

## Response Viewer

### Response Body

#### Viewing Modes
- **Pretty**: Formatted JSON/XML with syntax highlighting
- **Raw**: Unformatted response
- **Preview**: Rendered HTML/images

#### Features
- Syntax highlighting
- Code folding
- Search within response
- Copy to clipboard

### Response Headers

View all response headers:
- Content-Type
- Cache-Control
- Set-Cookie
- Custom headers

### Status Information

| Status Range | Meaning |
|--------------|---------||
| 100-199 | Informational |
| 200-299 | Success |
| 300-399 | Redirection |
| 400-499 | Client Error |
| 500-599 | Server Error |

Common status codes:
- **200 OK**: Request successful
- **201 Created**: Resource created
- **400 Bad Request**: Invalid request
- **401 Unauthorized**: Authentication required
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Server problem

### Response Actions

- **Save Response**: Store for later reference
- **Copy**: Copy response to clipboard
- **Download**: Save as file
- **Clear**: Remove current response

## Collections

### Creating Collections

1. Click the "+" button in the collection explorer
2. Enter collection name
3. Add optional description
4. Set collection-level variables (optional)

### Organizing Requests

#### Folder Structure
```
📁 My API Collection
├── 📁 Authentication
│   ├── 📄 Login
│   ├── 📄 Refresh Token
│   └── 📄 Logout
├── 📁 Users
│   ├── 📄 Get All Users
│   ├── 📄 Get User by ID
│   ├── 📄 Create User
│   └── 📄 Update User
└── 📁 Products
    ├── 📄 List Products
    └── 📄 Search Products
```

#### Best Practices
- Group by resource type
- Use descriptive names
- Add request descriptions
- Document expected responses

### Importing Collections

#### From Postman
1. Export collection from Postman (v2.1 format)
2. Click "Import" in API Client
3. Select the .json file
4. Review and confirm import

#### Supported Formats
- Postman Collection v2.1
- OpenAPI/Swagger (coming soon)
- HAR files (coming soon)

### Exporting Collections

1. Right-click collection
2. Select "Export"
3. Choose format (Postman v2.1)
4. Save file

## Variables & Environments

### Variable Types

#### Global Variables
- Available everywhere
- Persist across sessions
- Example: `{{api_version}}`

#### Environment Variables
- Specific to selected environment
- Switch between dev/staging/prod
- Example: `{{base_url}}`

#### Collection Variables
- Scoped to collection
- Shared across collection requests
- Example: `{{auth_endpoint}}`

#### Local Variables
- Request-specific
- Set via scripts
- Example: `{{timestamp}}`

### Using Variables

#### Variable Syntax
```
{{variable_name}}
```

#### In URLs
```
{{protocol}}://{{host}}/{{version}}/users
```

#### In Headers
```
Authorization: {{auth_type}} {{token}}
X-Request-ID: {{$guid}}
```

#### In Body
```json
{
  "timestamp": "{{$timestamp}}",
  "user_id": "{{user_id}}",
  "api_key": "{{api_key}}"
}
```

### Managing Environments

![Environment Manager](./assets/environment-manager.png)
*The Environment Manager dropdown showing environment switching options*

#### Creating Environments
1. Click environment dropdown
2. Select "Manage Environments"
3. Click "Add Environment"
4. Define variables:

```
Development:
  base_url: http://localhost:3000
  api_key: dev-key-123
  
Production:
  base_url: https://api.example.com
  api_key: prod-key-456
```

#### Switching Environments
- Use dropdown in top toolbar
- Changes apply immediately
- All variables update

### Variable Scope

Resolution order (first wins):
1. Local variables
2. Data variables
3. Environment variables
4. Collection variables
5. Global variables

## Scripting

### Pre-request Scripts

Run before request is sent:

```javascript
// Set dynamic timestamp
pm.environment.set("timestamp", new Date().toISOString());

// Generate random ID
pm.environment.set("random_id", Math.random().toString(36));

// Calculate signature
const signature = CryptoJS.HmacSHA256(pm.request.body, pm.environment.get("secret"));
pm.request.headers.add({
    key: "X-Signature",
    value: signature.toString()
});
```

### Test Scripts

Run after response received:

```javascript
// Test status code
pm.test("Status is 200", () => {
    pm.expect(pm.response.code).to.equal(200);
});

// Test response time
pm.test("Response time under 500ms", () => {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// Test response body
pm.test("Has user data", () => {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("user");
    pm.expect(jsonData.user).to.have.property("id");
});

// Extract data for next request
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("user_id", jsonData.user.id);
    pm.environment.set("auth_token", jsonData.token);
}
```

### PM API Reference

#### Request Object
```javascript
pm.request.url         // Request URL
pm.request.method      // HTTP method
pm.request.headers     // Headers object
pm.request.body        // Request body
```

#### Response Object
```javascript
pm.response.code       // Status code
pm.response.status     // Status text
pm.response.headers    // Response headers
pm.response.json()     // Parse JSON response
pm.response.text()     // Get text response
pm.response.responseTime // Time in ms
```

#### Environment Methods
```javascript
pm.environment.get(key)      // Get variable
pm.environment.set(key, value) // Set variable
pm.environment.unset(key)    // Remove variable
pm.environment.clear()       // Clear all
```

#### Test Methods
```javascript
pm.test(name, function)      // Define test
pm.expect(actual).to         // Assertion chain
pm.response.to.have          // Response assertions
```

### Common Script Examples

#### Dynamic Authentication
```javascript
// Pre-request: Refresh token if expired
const tokenExpiry = pm.environment.get("token_expiry");
if (!tokenExpiry || new Date() > new Date(tokenExpiry)) {
    pm.sendRequest({
        url: pm.environment.get("auth_url") + "/refresh",
        method: "POST",
        body: {
            refresh_token: pm.environment.get("refresh_token")
        }
    }, (err, res) => {
        if (!err && res.code === 200) {
            const data = res.json();
            pm.environment.set("access_token", data.access_token);
            pm.environment.set("token_expiry", data.expires_at);
        }
    });
}
```

#### Data Validation
```javascript
// Test: Validate response schema
const schema = {
    type: "object",
    properties: {
        id: { type: "number" },
        name: { type: "string" },
        email: { type: "string", format: "email" },
        created_at: { type: "string", format: "date-time" }
    },
    required: ["id", "name", "email"]
};

pm.test("Schema is valid", () => {
    pm.expect(tv4.validate(pm.response.json(), schema)).to.be.true;
});
```

#### Chaining Requests
```javascript
// Test: Use response in next request
if (pm.response.code === 201) {
    const newUser = pm.response.json();
    
    // Set for next request
    pm.environment.set("created_user_id", newUser.id);
    
    // Optional: Trigger next request
    postman.setNextRequest("Get User by ID");
}
```

## Advanced Features

### Code Generation

#### Available Languages

1. **cURL**
   ```bash
   curl -X GET "https://api.example.com/users" \
        -H "Authorization: Bearer token123" \
        -H "Content-Type: application/json"
   ```

2. **JavaScript (Fetch)**
   ```javascript
   fetch("https://api.example.com/users", {
       method: "GET",
       headers: {
           "Authorization": "Bearer token123",
           "Content-Type": "application/json"
       }
   })
   .then(response => response.json())
   .then(data => console.log(data));
   ```

3. **Python (Requests)**
   ```python
   import requests
   
   headers = {
       "Authorization": "Bearer token123",
       "Content-Type": "application/json"
   }
   
   response = requests.get("https://api.example.com/users", headers=headers)
   print(response.json())
   ```

#### How to Generate Code

1. Configure your request
2. Click the dropdown arrow next to "Send"
3. Select "Copy as [Language]"
4. Paste into your application

### Request History

#### Viewing History
- Each request execution is saved
- Access via History tab
- Filter by date, status, or URL

#### History Actions
- **Restore**: Load historical request
- **Compare**: Diff two responses
- **Clear**: Remove history entries

### Proxy Configuration

#### When to Use Proxy

Use the proxy server when:
- API doesn't support CORS
- Testing local services
- Need to bypass browser restrictions

#### Starting the Proxy

1. **Download proxy server**:
   ```bash
   # Choose your platform
   ./proxy-server-macos
   ./proxy-server-windows.exe
   ./proxy-server-linux
   ```

2. **Run with options**:
   ```bash
   ./proxy-server --port 9090 --origin http://localhost:5173
   ```

3. **Configure in API Client**:
   - Go to Settings
   - Enable "Use Proxy"
   - Set proxy URL: `http://localhost:9090`

#### Proxy Features
- HTTPS support
- WebSocket proxying
- Custom headers
- Authentication passthrough

### Keyboard Shortcuts

#### Global Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Send Request | Ctrl + Enter | Cmd + Enter |
| Save Request | Ctrl + S | Cmd + S |
| New Request | Ctrl + N | Cmd + N |
| Find | Ctrl + F | Cmd + F |
| Toggle Sidebar | Ctrl + B | Cmd + B |

#### Editor Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Format JSON | Alt + Shift + F | Option + Shift + F |
| Comment Line | Ctrl + / | Cmd + / |
| Duplicate Line | Ctrl + D | Cmd + D |
| Move Line Up/Down | Alt + ↑/↓ | Option + ↑/↓ |

## Troubleshooting

### Common Issues

#### Request Timeout
**Problem**: Request takes too long and times out

**Solutions**:
- Check internet connection
- Verify API endpoint is correct
- Increase timeout in settings
- Check if API server is responding

#### Invalid JSON Response
**Problem**: "Unexpected token" error in response

**Solutions**:
- Check Content-Type header
- Verify API returns valid JSON
- Try "Raw" view to see actual response
- Check for HTML error pages

#### Variables Not Resolving
**Problem**: {{variable}} shown instead of value

**Solutions**:
- Check variable is defined
- Verify environment is selected
- Check variable scope
- Look for typos in variable name

### CORS Problems

#### What is CORS?
Cross-Origin Resource Sharing prevents browsers from making requests to different domains.

#### CORS Error Signs
- "Access-Control-Allow-Origin" error
- Request blocked by browser
- Works in Postman but not browser

#### Solutions

1. **Use Proxy Server** (Recommended)
   - Start included proxy server
   - Route requests through proxy
   - Bypasses browser restrictions

2. **Server-Side Fix**
   - Add CORS headers to API
   - Configure allowed origins
   - Not always possible

3. **Development Mode**
   - Some APIs have CORS-free endpoints
   - Use development/sandbox URLs

### Performance Tips

#### Large Responses
- Use pagination when available
- Limit response fields
- Enable response streaming
- Clear old responses regularly

#### Many Requests
- Organize in folders
- Use collection runner for bulk
- Clear history periodically
- Close unused tabs

#### Script Performance
- Avoid heavy computations
- Use async operations
- Cache repeated calculations
- Minimize external requests

## FAQ

### General Questions

**Q: Is API Client free to use?**
A: Yes, the core features are free. Premium features may be added in the future.

**Q: Can I use it offline?**
A: The app works offline, but you need internet to make API requests.

**Q: Is my data secure?**
A: All data is stored locally in your browser. Nothing is sent to our servers.

**Q: Can I import from Postman?**
A: Yes, export your Postman collection as v2.1 format and import it.

### Technical Questions

**Q: What's the maximum response size?**
A: Browser-dependent, typically 50-100MB. Large responses may slow the UI.

**Q: Can I test WebSocket APIs?**
A: WebSocket support is planned for a future release.

**Q: Does it support GraphQL?**
A: Basic GraphQL queries work with POST requests. Full support coming soon.

**Q: Can I run it locally?**
A: Yes, you can self-host the application. See the GitHub repository.

### Feature Questions

**Q: Can multiple people share collections?**
A: Currently local-only. Team sync features are planned.

**Q: Is there a CLI version?**
A: No, but you can export to cURL for command-line use.

**Q: Can I generate API documentation?**
A: Documentation generation is planned for a future release.

**Q: Does it support OAuth 2.0?**
A: Manual OAuth is supported. Automated flow coming soon.

### Troubleshooting Questions

**Q: Why can't I connect to localhost?**
A: Check if your local server is running and the port is correct.

**Q: How do I debug failed requests?**
A: Check the browser console (F12) for detailed error messages.

**Q: Can I increase the request timeout?**
A: Yes, in Settings → Request → Timeout (default 30 seconds).

**Q: How do I report bugs?**
A: Use the GitHub issues page or the feedback form in the app.

---

## Support & Resources

### Getting Help
- **Documentation**: This guide and in-app help
- **GitHub Issues**: Report bugs and request features
- **Community Forum**: Coming soon
- **Email Support**: support@api-client.dev

### Learning Resources
- **Video Tutorials**: YouTube channel (coming soon)
- **Blog Posts**: Tips and best practices
- **API Examples**: Sample collections to import
- **Script Library**: Reusable script snippets

### Contributing
API Client is open source! Contribute on GitHub:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

---

*Last updated: January 2025*