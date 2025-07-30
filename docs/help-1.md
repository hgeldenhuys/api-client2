# API Client User Guide

Welcome to the Modern API Client - a powerful, secure, and intuitive tool for API development and testing. This guide will help you get started and master all features.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Creating Your First Request](#creating-your-first-request)
4. [Collections & Organization](#collections--organization)
5. [Environments & Variables](#environments--variables)
6. [Authentication](#authentication)
7. [Scripts & Automation](#scripts--automation)
8. [Importing & Exporting](#importing--exporting)
9. [Security Features](#security-features)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Quick Start (2 minutes)

1. **Open the API Client** - Navigate to the application URL
2. **Import a Collection** - Click "Import" and upload a Postman collection
3. **Send Your First Request** - Select any request and press `Cmd+Enter` (Mac) or `Ctrl+Enter` (Windows)
4. **View Response** - Check the right panel for response details

### Creating Your First Collection

1. Click **"New Collection"** in the left sidebar
2. Enter a name like "My First API"
3. Click **"Create Collection"**
4. Right-click the collection and select **"Add Request"**
5. Name your request "Hello World"

---

## Interface Overview

### Three-Panel Layout

```
┌─────────────────┬─────────────────────┬──────────────────┐
│   Collections   │   Request Builder   │ Response Viewer  │
│                 │                     │                  │
│  📁 My APIs     │  GET ▼ https://...  │  Status: 200 OK  │
│    ├─ Users     │                     │  Time: 234ms     │
│    └─ Posts     │  Headers ▼ Body ▼   │  Size: 1.2 KB    │
│                 │                     │                  │
│  🔍 Search...   │  Send Request       │  {               │
│                 │                     │    "id": 1,      │
└─────────────────┴─────────────────────┴──────────────────┘
```

### Panel Details

#### Left Panel - Collection Explorer
- **Collections**: Organize your APIs hierarchically
- **Search Bar**: Find requests instantly with `Cmd+F`
- **Folders**: Group related requests
- **Drag & Drop**: Reorganize by dragging items

#### Center Panel - Request Builder
- **Method Selector**: GET, POST, PUT, PATCH, DELETE, etc.
- **URL Bar**: Enter API endpoints with variables
- **Tabs**: Headers, Body, Auth, Scripts, Settings
- **Send Button**: Execute requests with `Cmd+Enter`

#### Right Panel - Response Viewer
- **Body Tab**: View response content
- **Headers Tab**: Response headers and metadata
- **Tests Tab**: Test results and assertions
- **Console Tab**: Script output and logs

---

## Creating Your First Request

### Step-by-Step Guide

#### 1. Basic GET Request
```
Method: GET
URL: https://jsonplaceholder.typicode.com/posts/1
```

#### 2. Adding Headers
```
Headers:
  Content-Type: application/json
  Authorization: Bearer your-token-here
```

#### 3. POST Request with JSON Body
```
Method: POST
URL: https://jsonplaceholder.typicode.com/posts
Headers:
  Content-Type: application/json
Body (raw JSON):
  {
    "title": "My New Post",
    "body": "This is the content",
    "userId": 1
  }
```

#### 4. Form Data Request
```
Method: POST
URL: https://api.example.com/upload
Body (form-data):
  Key: file, Value: [select file]
  Key: name, Value: My Document
```

---

## Collections & Organization

### Creating Collections

#### Method 1: From Scratch
1. Click **"New Collection"** button
2. Enter collection name: "E-commerce API"
3. Add description: "REST API for online store"
4. Click **Create**

#### Method 2: From Folder
1. Right-click in Collections panel
2. Select **"New Collection"**
3. Follow the same steps as above

### Organizing with Folders

#### Creating Folders
1. Right-click on a collection
2. Select **"Add Folder"**
3. Name it: "Users", "Products", "Orders"

#### Moving Requests
- **Drag & Drop**: Click and drag requests between folders
- **Right-click Menu**: Use "Move to Folder" option

### Collection Variables

#### Setting Variables
1. Right-click collection → **"Edit"**
2. Go to **Variables** tab
3. Add variables:
   ```
   Key: base_url, Value: https://api.example.com
   Key: api_version, Value: v1
   ```

#### Using Variables
In your requests, use `{{base_url}}/users` instead of full URLs

---

## Environments & Variables

### Environment Types

#### 1. Global Variables
- Available across all collections
- Set in **Settings → Global Variables**

#### 2. Collection Variables
- Available within specific collection
- Set in collection **Edit → Variables**

#### 3. Environment Variables
- Switch between dev/staging/prod
- Set in **Environments** panel

### Creating Environments

#### Step 1: Create Environment
1. Click **Environments** tab (bottom left)
2. Click **"New Environment"**
3. Name: "Development"

#### Step 2: Add Variables
```
Variable: base_url
Value: https://dev-api.example.com

Variable: api_key
Value: dev-key-12345
```

#### Step 3: Switch Environments
- Click environment dropdown
- Select "Development", "Staging", or "Production"

### Variable Scopes

```
Priority Order (highest to lowest):
1. Local variables (request-specific)
2. Data variables (from CSV/JSON files)
3. Environment variables
4. Collection variables
5. Global variables
```

---

## Authentication

### Supported Authentication Types

#### 1. No Authentication
Use for public APIs

#### 2. API Key
```
Type: API Key
Key: X-API-Key
Value: your-api-key-here
Add to: Header
```

#### 3. Bearer Token
```
Type: Bearer Token
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

#### 4. Basic Authentication
```
Type: Basic Auth
Username: your-username
Password: your-password
```

#### 5. OAuth 2.0
```
Type: OAuth 2.0
Grant Type: Authorization Code
Callback URL: https://oauth.example.com/callback
Auth URL: https://oauth.example.com/authorize
Access Token URL: https://oauth.example.com/token
Client ID: your-client-id
Client Secret: your-client-secret
```

### Setting Authentication

#### For Entire Collection
1. Right-click collection → **Edit**
2. Go to **Authorization** tab
3. Set authentication type
4. All requests inherit this auth

#### For Individual Request
1. Open request
2. Go to **Authorization** tab
3. Select **"Inherit auth from parent"** or **"No auth"**
4. Or set custom authentication

---

## Scripts & Automation

### Pre-request Scripts

#### What are Pre-request Scripts?
JavaScript code that runs before sending the request. Useful for:
- Generating timestamps
- Creating signatures
- Setting dynamic variables

#### Example: Add Timestamp
```javascript
// Set current timestamp as header
const timestamp = Date.now();
pm.request.headers.add({
    key: 'X-Timestamp',
    value: timestamp.toString()
});
```

#### Example: Generate Random ID
```javascript
// Generate random user ID
const userId = Math.floor(Math.random() * 1000);
pm.environment.set('random_user_id', userId);
```

### Test Scripts

#### What are Test Scripts?
JavaScript code that runs after receiving the response. Used for:
- Validating response data
- Checking status codes
- Setting variables from response

#### Example: Basic Test
```javascript
// Test status code
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

// Test response time
pm.test('Response time is less than 500ms', function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// Test JSON response
pm.test('Response has user ID', function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
});
```

#### Example: Set Variable from Response
```javascript
// Save user ID from response
const jsonData = pm.response.json();
pm.environment.set('user_id', jsonData.id);
```

### Available Libraries

#### Built-in Objects
- `pm`: Postman-like API
- `console`: Logging to console tab
- `require`: Import external libraries

#### Common Methods
```javascript
// Variables
pm.environment.set('key', 'value');
pm.environment.get('key');
pm.environment.unset('key');

// Request
pm.request.headers.add({key: 'name', value: 'value'});
pm.request.headers.remove('name');

// Response
pm.response.code;
pm.response.headers.get('Content-Type');
pm.response.json();
pm.response.text();

// Tests
pm.test('test name', function () {
    // test code
});
```

---

## Importing & Exporting

### Importing Collections

#### From Postman
1. In Postman: **Collection → Export → Collection v2.1**
2. In API Client: Click **Import**
3. Select the exported `.json` file
4. Click **Import**

#### From cURL
1. Click **Import**
2. Select **Raw text** tab
3. Paste cURL command:
   ```bash
   curl -X GET "https://api.example.com/users" \
        -H "Authorization: Bearer token"
   ```
4. Click **Import**

#### From OpenAPI
1. Click **Import**
2. Select **OpenAPI** tab
3. Upload `.yaml` or `.json` file
4. Configure import options
5. Click **Import**

### Exporting Collections

#### Export as Postman Collection
1. Right-click collection
2. Select **Export**
3. Choose **Postman Collection v2.1**
4. Select location and save

#### Export as OpenAPI
1. Right-click collection
2. Select **Export**
3. Choose **OpenAPI 3.0**
4. Configure options and save

### Sharing Collections

#### Via File
1. Export collection as JSON
2. Share file via email/Slack
3. Recipient imports the file

#### Via URL (Coming Soon)
1. Generate shareable link
2. Set permissions (view/edit)
3. Share link with team

---

## Security Features

### Data Encryption

#### How It Works
- All sensitive data encrypted with AES-256-GCM
- Keys derived using PBKDF2 (100,000 iterations)
- Encrypted data includes:
  - API keys and tokens
  - Environment variables
  - Collection variables
  - Request history

#### Managing Encryption
1. **Settings → Security**
2. Set master password for encryption
3. Enable/disable encryption for specific data types

### Secure Sharing

#### Export Without Secrets
1. **Export Collection**
2. Check **"Exclude sensitive data"**
3. Secrets will be replaced with placeholders

#### Environment Isolation
- **Development**: Local encrypted storage
- **Staging**: Shared with team (encrypted)
- **Production**: Restricted access

### Memory Protection

#### Automatic Cleanup
- Sensitive data cleared from memory after:
  - 5 minutes of inactivity
  - Browser tab closed
  - Manual logout

#### Manual Cleanup
1. **Settings → Security → Clear Sensitive Data**
2. Or use keyboard shortcut: `Cmd+Shift+Delete`

---

## Keyboard Shortcuts

### General Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd+N` | New request |
| `Cmd+Shift+N` | New collection |
| `Cmd+O` | Open collection |
| `Cmd+S` | Save current request |
| `Cmd+Enter` | Send request |
| `Cmd+Shift+Enter` | Send and download |
| `Cmd+F` | Find in collection |
| `Cmd+T` | New tab |
| `Cmd+W` | Close tab |
| `Cmd+Shift+T` | Reopen closed tab |

### Navigation Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd+1-9` | Switch to tab 1-9 |
| `Cmd+Shift+[` | Previous tab |
| `Cmd+Shift+]` | Next tab |
| `Cmd+E` | Focus URL bar |
| `Cmd+K` | Quick open (search collections) |

### Editor Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd+/` | Toggle comment |
| `Cmd+D` | Duplicate line |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Tab` | Indent |
| `Shift+Tab` | Unindent |

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors
**Problem**: "CORS policy blocked request"
**Solutions**:
- Use the built-in proxy server
- Add CORS headers to your API
- Use browser extension for development

#### 2. Authentication Issues
**Problem**: "401 Unauthorized"
**Solutions**:
- Check token expiration
- Verify authentication type
- Check variable substitution
- Test with curl to verify credentials

#### 3. SSL Certificate Errors
**Problem**: "SSL certificate problem"
**Solutions**:
- Use valid SSL certificates
- For development: disable SSL verification
- Import custom certificates

#### 4. Large Response Issues
**Problem**: Browser freezes with large responses
**Solutions**:
- Enable response streaming
- Use pagination for large datasets
- Filter response data

### Performance Tips

#### 1. Large Collections
- Use folders to organize requests
- Enable lazy loading in settings
- Use search instead of scrolling

#### 2. Slow Requests
- Check network conditions
- Use environment variables for base URLs
- Enable request caching

#### 3. Memory Usage
- Clear response history regularly
- Close unused tabs
- Use collection variables instead of duplicating data

### Getting Help

#### 1. In-App Help
- **Help → Documentation** (this guide)
- **Help → Keyboard Shortcuts**
- **Help → Report Issue**

#### 2. Community Support
- **GitHub Issues**: Report bugs and feature requests
- **Discord**: Join our community server
- **Email**: support@api-client.com

#### 3. Debug Mode
1. **Settings → Advanced → Enable Debug Mode**
2. Check browser console for detailed logs
3. Export debug information for support

---

## Next Steps

### For Beginners
1. Complete the [Quick Start Tutorial](#getting-started)
2. Import a sample collection
3. Practice with the [JSONPlaceholder API](https://jsonplaceholder.typicode.com)

### For Advanced Users
1. Explore [Scripts & Automation](#scripts--automation)
2. Set up [Environments](#environments--variables)
3. Configure [Team Collaboration](#importing--exporting)

### For Teams
1. Set up shared environments
2. Configure team authentication
3. Establish naming conventions
4. Create team templates

---

**Need more help?** Check our [Advanced Guide](help-2.md) for power user features, or visit our [Community Forum](https://community.api-client.com).

<audio>I've created comprehensive user documentation covering everything from basic setup to advanced features. The guide includes step-by-step tutorials, keyboard shortcuts, troubleshooting tips, and security best practices to help users get the most out of the API client.</audio>