import { test, expect } from '@playwright/test';

test.describe('Pre-request Script Request Modification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"], .flex.h-screen', { 
      state: 'visible',
      timeout: 10000 
    });
  });

  test('should modify request headers in pre-request script', async ({ page }) => {
    // Create a new collection
    await page.click('text=New Collection');
    await page.fill('input[placeholder="My API Collection"]', 'Header Modification Test');
    await page.click('button:has-text("Create")');
    
    // Add a new request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'Header Test Request');
    await page.click('button:has-text("Add")');
    
    // Click on the request to open it
    await page.click('text=Header Test Request');
    
    // Set request URL to httpbin (it echoes headers back)
    await page.fill('input[placeholder="Enter request URL"]', 'https://httpbin.org/headers');
    
    // Navigate to Pre-request Script tab
    await page.click('text=Pre-request Script');
    
    // Wait for Monaco Editor to load
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    
    // Add pre-request script to modify headers
    const headerScript = `
// Add custom headers
pm.request.addHeader('X-Custom-Header', 'test-value-123');
pm.request.addHeader('X-Timestamp', Date.now().toString());
pm.request.addHeader('Authorization', 'Bearer custom-token');

console.log('Headers added successfully');
`;
    
    // Type in Monaco Editor
    await page.click('.monaco-editor');
    await page.keyboard.type(headerScript);
    
    // Send the request
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('text=Response', { timeout: 10000 });
    
    // Check that our custom headers appear in the response
    await expect(page.locator('text="X-Custom-Header"')).toBeVisible();
    await expect(page.locator('text="test-value-123"')).toBeVisible();
    await expect(page.locator('text="Authorization"')).toBeVisible();
    await expect(page.locator('text="Bearer custom-token"')).toBeVisible();
    
    // Check console output
    await page.click('text=Console');
    await expect(page.locator('text=Headers added successfully')).toBeVisible();
  });

  test('should modify request URL in pre-request script', async ({ page }) => {
    // Create a new collection
    await page.click('text=New Collection');
    await page.fill('input[placeholder="My API Collection"]', 'URL Modification Test');
    await page.click('button:has-text("Create")');
    
    // Add a new request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'URL Test Request');
    await page.click('button:has-text("Add")');
    
    // Click on the request to open it
    await page.click('text=URL Test Request');
    
    // Set initial request URL
    await page.fill('input[placeholder="Enter request URL"]', 'https://httpbin.org/status/200');
    
    // Navigate to Pre-request Script tab
    await page.click('text=Pre-request Script');
    
    // Add pre-request script to modify URL
    const urlScript = `
// Change URL to get user agent instead of status
pm.request.setUrl('https://httpbin.org/user-agent');

console.log('URL modified to:', pm.request.url);
`;
    
    // Type in Monaco Editor
    await page.click('.monaco-editor');
    await page.keyboard.type(urlScript);
    
    // Send the request
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('text=Response', { timeout: 10000 });
    
    // Check that we got user-agent response (not status response)
    await expect(page.locator('text="user-agent"')).toBeVisible();
    
    // Verify console shows URL was modified
    await page.click('text=Console');
    await expect(page.locator('text=URL modified to: https://httpbin.org/user-agent')).toBeVisible();
  });

  test('should modify request body in pre-request script', async ({ page }) => {
    // Create a new collection
    await page.click('text=New Collection');
    await page.fill('input[placeholder="My API Collection"]', 'Body Modification Test');
    await page.click('button:has-text("Create")');
    
    // Add a new request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'Body Test Request');
    await page.click('button:has-text("Add")');
    
    // Click on the request to open it
    await page.click('text=Body Test Request');
    
    // Change method to POST
    await page.click('text=GET');
    await page.click('text=POST');
    
    // Set request URL to httpbin echo endpoint
    await page.fill('input[placeholder="Enter request URL"]', 'https://httpbin.org/post');
    
    // Navigate to Body tab
    await page.click('text=Body');
    
    // Select Raw body type
    await page.click('text=Body Type');
    await page.click('text=Raw');
    
    // Add initial body
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    await page.click('.monaco-editor');
    await page.keyboard.type('{"original": "body"}');
    
    // Navigate to Pre-request Script tab
    await page.click('text=Pre-request Script');
    
    // Add pre-request script to modify body
    const bodyScript = `
// Create dynamic body
const dynamicBody = {
  original: 'body',
  modified: true,
  timestamp: Date.now(),
  randomId: Math.floor(Math.random() * 1000)
};

// Set the new body
pm.request.setBody(JSON.stringify(dynamicBody));

// Add appropriate header
pm.request.addHeader('Content-Type', 'application/json');

console.log('Body modified:', JSON.stringify(dynamicBody));
`;
    
    // Type in Monaco Editor
    await page.click('.monaco-editor');
    await page.keyboard.type(bodyScript);
    
    // Send the request
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('text=Response', { timeout: 10000 });
    
    // Check that the modified body was sent (httpbin echoes it back)
    await expect(page.locator('text="modified"')).toBeVisible();
    await expect(page.locator('text="timestamp"')).toBeVisible();
    await expect(page.locator('text="randomId"')).toBeVisible();
    
    // Verify console shows body modification
    await page.click('text=Console');
    await expect(page.locator('text=Body modified:')).toBeVisible();
  });

  test('should use example script for header modification', async ({ page }) => {
    // Create a new collection
    await page.click('text=New Collection');
    await page.fill('input[placeholder="My API Collection"]', 'Example Script Test');
    await page.click('button:has-text("Create")');
    
    // Add a new request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'Example Request');
    await page.click('button:has-text("Add")');
    
    // Click on the request to open it
    await page.click('text=Example Request');
    
    // Set request URL
    await page.fill('input[placeholder="Enter request URL"]', 'https://httpbin.org/headers');
    
    // Navigate to Pre-request Script tab
    await page.click('text=Pre-request Script');
    
    // Click Examples dropdown
    await page.click('button:has-text("Examples")');
    
    // Select "Modify Request Headers" example
    await page.click('text=Modify Request Headers');
    
    // Verify script was inserted
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    await expect(page.locator('text=Add authentication header')).toBeVisible();
    
    // Send the request
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('text=Response', { timeout: 10000 });
    
    // Check that custom headers from example appear in response
    await expect(page.locator('text="X-API-Version"')).toBeVisible();
    await expect(page.locator('text="X-Request-ID"')).toBeVisible();
  });
});