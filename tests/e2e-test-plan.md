# API Client E2E Test Plan

## Prerequisites
- Application running on http://localhost:5173
- Demo collection loaded
- Browser with DevTools support

## Test Scenarios

### 1. Navigation Tests

#### Test 1.1: Hash-based navigation
```javascript
// Navigate to collection view
await page.goto('http://localhost:5173/#collection');
await page.waitForSelector('[data-testid="collection-explorer"]');

// Navigate to environment view
await page.goto('http://localhost:5173/#environment');
await page.waitForSelector('[data-testid="environment-view"]');

// Navigate to globals view
await page.goto('http://localhost:5173/#globals');
await page.waitForSelector('text=/Globals view coming soon/');
```

#### Test 1.2: Keyboard shortcuts
```javascript
// Test Cmd/Ctrl + 1 for collection view
await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
await page.keyboard.press('1');
await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
assert(page.url().includes('#collection'));

// Test Cmd/Ctrl + 2 for environment view
await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
await page.keyboard.press('2');
await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
assert(page.url().includes('#environment'));
```

#### Test 1.3: Tab navigation
```javascript
// Click Collections tab
await page.click('button:has-text("Collections")');
assert(page.url().includes('#collection'));

// Click Environments tab
await page.click('button:has-text("Environments")');
assert(page.url().includes('#environment'));

// Verify active tab styling
const activeTab = await page.$('button.bg-accent:has-text("Environments")');
assert(activeTab !== null);
```

### 2. Collection Explorer Tests

#### Test 2.1: Folder expansion
```javascript
// Find a folder and click to expand
const folder = await page.$('.cursor-pointer:has-text("Users")');
await folder.click();

// Verify chevron rotated (ChevronDown class present)
await page.waitForSelector('svg.lucide-chevron-down');

// Click again to collapse
await folder.click();
await page.waitForSelector('svg.lucide-chevron-right');
```

#### Test 2.2: Request selection
```javascript
// Click on a request
const request = await page.$('.cursor-pointer:has-text("Get Users")');
await request.click();

// Verify request is highlighted
await page.waitForSelector('.bg-accent:has-text("Get Users")');

// Verify request appears in center panel
await page.waitForSelector('input[value*="/users"]');

// Verify tab is created
await page.waitForSelector('.rounded-t-md:has-text("Get Users")');
```

#### Test 2.3: Collection operations
```javascript
// Click New Collection button
await page.click('button:has-text("New Collection")');
// Implementation depends on dialog/form that appears

// Test Import
await page.click('button:has-text("Import")');
await page.waitForSelector('[role="dialog"]');
await page.click('button:has-text("Cancel")');
```

### 3. Request Builder Tests

#### Test 3.1: Tab management
```javascript
// Open multiple requests
await page.click('.cursor-pointer:has-text("Get Users")');
await page.click('.cursor-pointer:has-text("Create User")');

// Verify both tabs exist
const tabs = await page.$$('.rounded-t-md');
assert(tabs.length >= 2);

// Switch between tabs
await page.click('.rounded-t-md:has-text("Get Users")');
await page.waitForSelector('input[value*="/users"]');

// Close a tab
await page.click('.rounded-t-md:has-text("Create User") button:has(svg.lucide-x)');
const remainingTabs = await page.$$('.rounded-t-md');
assert(remainingTabs.length === tabs.length - 1);
```

#### Test 3.2: Request editing with auto-save
```javascript
// Select a request
await page.click('.cursor-pointer:has-text("Get Users")');

// Edit URL
const urlInput = await page.$('input[placeholder="Enter request URL"]');
await urlInput.click({ clickCount: 3 }); // Select all
await urlInput.type('https://api.example.com/v2/users');

// Wait for auto-save (1 second debounce)
await page.waitForTimeout(1100);

// Switch to another request
await page.click('.cursor-pointer:has-text("Create User")');

// Switch back
await page.click('.cursor-pointer:has-text("Get Users")');

// Verify URL was saved
const savedUrl = await page.$eval('input[placeholder="Enter request URL"]', el => el.value);
assert(savedUrl === 'https://api.example.com/v2/users');
```

#### Test 3.3: Headers management
```javascript
// Click Headers tab
await page.click('button:has-text("Headers")');

// Add a header
await page.click('button:has-text("Add Header")');
const keyInput = await page.$('input[placeholder="Key"]');
const valueInput = await page.$('input[placeholder="Value"]');

await keyInput.type('Authorization');
await valueInput.type('Bearer {{token}}');

// Wait for auto-save
await page.waitForTimeout(1100);

// Verify header persists after switching requests
await page.click('.cursor-pointer:has-text("Create User")');
await page.click('.cursor-pointer:has-text("Get Users")');
await page.click('button:has-text("Headers")');

const savedKey = await page.$eval('input[placeholder="Key"]', el => el.value);
assert(savedKey === 'Authorization');
```

### 4. Environment Management Tests

#### Test 4.1: Environment creation
```javascript
// Navigate to environment view
await page.goto('http://localhost:5173/#environment');

// Click + button to add environment
await page.click('button:has(svg.lucide-plus)');

// Enter environment name
const nameInput = await page.waitForSelector('input[value="New Environment"]');
await nameInput.click({ clickCount: 3 });
await nameInput.type('Production');
await nameInput.press('Enter');

// Verify environment appears in list
await page.waitForSelector('.rounded:has-text("Production")');
```

#### Test 4.2: Variable management
```javascript
// Select an environment
await page.click('.rounded:has-text("Production")');

// Add a variable
const varKeyInput = await page.$('input[placeholder="Variable name"]');
const varValueInput = await page.$('input[placeholder="Value"]');

await varKeyInput.type('baseUrl');
await varValueInput.type('https://api.production.com');
await page.click('button:has-text("Add")');

// Verify variable appears in table
await page.waitForSelector('td:has-text("baseUrl")');

// Edit variable value inline
const valueCell = await page.$('tr:has-text("baseUrl") input');
await valueCell.click({ clickCount: 3 });
await valueCell.type('https://api.prod.example.com');

// Delete variable
await page.click('tr:has-text("baseUrl") button:has(svg.lucide-trash-2)');
await page.waitForSelector('tr:has-text("baseUrl")', { state: 'detached' });
```

#### Test 4.3: Secret management
```javascript
// Add a secret
const keyInput = await page.$('input[placeholder="Variable name"]');
const valueInput = await page.$('input[placeholder="Value"]');

await keyInput.type('apiKey');
await valueInput.type('secret-key-123');

// Select Secret type
await page.click('button[role="combobox"]');
await page.click('[role="option"]:has-text("Secret")');

await page.click('button:has-text("Add")');

// Verify secret appears with lock icon
await page.waitForSelector('tr:has-text("apiKey") svg.lucide-lock');

// Verify value is masked
const secretInput = await page.$('tr:has-text("apiKey") input[type="password"]');
assert(secretInput !== null);

// Toggle show/hide secrets
await page.click('button:has(svg.lucide-eye)');
const visibleSecret = await page.$('tr:has-text("apiKey") input[type="text"]');
assert(visibleSecret !== null);
```

#### Test 4.4: Global variables
```javascript
// Click Global Variables
await page.click('button:has-text("Global Variables")');

// Add global variable
const globalKeyInput = await page.$('input[placeholder="Variable name"]');
const globalValueInput = await page.$('input[placeholder="Value"]');

await globalKeyInput.type('apiVersion');
await globalValueInput.type('v1');
await page.click('button:has-text("Add")');

// Toggle enabled/disabled
const checkbox = await page.$('tr:has-text("apiVersion") input[type="checkbox"]');
await checkbox.click();

// Verify disabled state
const isChecked = await page.$eval('tr:has-text("apiVersion") input[type="checkbox"]', el => el.checked);
assert(isChecked === false);
```

### 5. Variable Resolution Tests

#### Test 5.1: Simple variable replacement
```javascript
// Create variable in environment
await page.goto('http://localhost:5173/#environment');
// ... create variable "host" = "localhost:3000"

// Go back to collection and use variable
await page.goto('http://localhost:5173/#collection');
await page.click('.cursor-pointer:has-text("Get Users")');

const urlInput = await page.$('input[placeholder="Enter request URL"]');
await urlInput.click({ clickCount: 3 });
await urlInput.type('http://{{host}}/api/users');

// Verify resolution (this would need UI to show resolved value)
// For now, we can test by sending the request
```

#### Test 5.2: Nested variable resolution
```javascript
// Create nested variables
// "protocol" = "https"
// "domain" = "api.example.com"
// "baseUrl" = "{{protocol}}://{{domain}}"

// Use in request
const urlInput = await page.$('input[placeholder="Enter request URL"]');
await urlInput.click({ clickCount: 3 });
await urlInput.type('{{baseUrl}}/v1/users');

// Test resolution
```

### 6. Response Viewer Tests

#### Test 6.1: Response display
```javascript
// Send a request (mock or real)
await page.click('button:has-text("Send")');

// Wait for response
await page.waitForSelector('.response-viewer', { timeout: 10000 });

// Verify status code displays
await page.waitForSelector('text=/200/');

// Verify response time displays
await page.waitForSelector('text=/\d+ms/');

// Check headers tab
await page.click('button:has-text("Headers")');
await page.waitForSelector('text=/content-type/');
```

### 7. Data Persistence Tests

#### Test 7.1: Reload persistence
```javascript
// Create test data
// ... create environment, variables, requests

// Store some identifiers
const envName = 'Test Environment';
const varKey = 'testVar';

// Reload page
await page.reload();

// Verify data persists
await page.goto('http://localhost:5173/#environment');
await page.waitForSelector(`.rounded:has-text("${envName}")`);
await page.click(`.rounded:has-text("${envName}")`);
await page.waitForSelector(`td:has-text("${varKey}")`);
```

#### Test 7.2: IndexedDB verification
```javascript
// Open DevTools and check IndexedDB
const client = await page.target().createCDPSession();
await client.send('Runtime.evaluate', {
  expression: `
    (async () => {
      const db = await indexedDB.open('APIClientDB');
      const tx = db.transaction(['collections', 'environments'], 'readonly');
      const collections = await tx.objectStore('collections').getAll();
      const environments = await tx.objectStore('environments').getAll();
      return { collections: collections.length, environments: environments.length };
    })()
  `,
  awaitPromise: true
});
```

## Test Implementation

### Puppeteer Setup
```javascript
const puppeteer = require('puppeteer');

async function runTests() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    // Run test suites
    await runNavigationTests(page);
    await runCollectionExplorerTests(page);
    await runRequestBuilderTests(page);
    await runEnvironmentTests(page);
    await runVariableTests(page);
    await runResponseTests(page);
    await runPersistenceTests(page);
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

runTests();
```

### Playwright Alternative
```javascript
const { test, expect } = require('@playwright/test');

test.describe('API Client E2E Tests', () => {
  test('Navigation works correctly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Test implementation
  });
  
  // More tests...
});
```

## CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          npm install -D puppeteer
      
      - name: Start application
        run: npm run dev &
        
      - name: Wait for application
        run: npx wait-on http://localhost:5173
        
      - name: Run E2E tests
        run: npm run test:e2e
```

## Manual Testing Checklist

- [ ] Navigation between views works
- [ ] Keyboard shortcuts function correctly
- [ ] Folders expand/collapse properly
- [ ] Requests can be selected and edited
- [ ] Changes auto-save after 1 second
- [ ] Environment variables can be created/edited/deleted
- [ ] Secrets are properly masked
- [ ] Variable resolution works in URLs and headers
- [ ] Response displays correctly
- [ ] Data persists after page reload
- [ ] IndexedDB contains expected data
