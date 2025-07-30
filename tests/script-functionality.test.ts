import { test, expect } from '@playwright/test';

test.describe('API Client Script Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"], .flex.h-screen', { 
      state: 'visible',
      timeout: 10000 
    });
  });

  test('should execute pre-request scripts and set environment variables', async ({ page }) => {
    // Create a new collection
    await page.click('text=New Collection');
    await page.fill('input[placeholder="My API Collection"]', 'Script Test Collection');
    await page.click('button:has-text("Create")');
    
    // Add a new request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'Pre-request Script Test');
    await page.click('button:has-text("Add")');
    
    // Click on the request to open it
    await page.click('text=Pre-request Script Test');
    
    // Navigate to Pre-request Script tab
    await page.click('text=Pre-request Script');
    
    // Wait for Monaco Editor to load
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    
    // Add pre-request script
    const preRequestScript = `
// Set environment variables
pm.environment.set('testToken', 'abc123');
pm.environment.set('timestamp', Date.now().toString());

// Log to console
console.log('Pre-request script executed');
console.info('Setting test token');
`;
    
    // Type in Monaco Editor (pre-request)
    await page.click('.monaco-editor');
    await page.keyboard.type(preRequestScript);
    
    // Set request URL (using httpbin for testing)
    await page.fill('input[placeholder="Enter request URL"]', 'https://httpbin.org/get');
    
    // Send the request
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('text=Response', { timeout: 10000 });
    
    // Check console output
    await page.click('text=Console');
    await expect(page.locator('text=Pre-request script executed')).toBeVisible();
    await expect(page.locator('text=[INFO] Setting test token')).toBeVisible();
  });

  test('should execute test scripts and display test results', async ({ page }) => {
    // Create a new collection
    await page.click('text=New Collection');
    await page.fill('input[placeholder="My API Collection"]', 'Test Script Collection');
    await page.click('button:has-text("Create")');
    
    // Add a new request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'Test Script Request');
    await page.click('button:has-text("Add")');
    
    // Click on the request to open it
    await page.click('text=Test Script Request');
    
    // Set request URL
    await page.fill('input[placeholder="Enter request URL"]', 'https://httpbin.org/json');
    
    // Navigate to Tests tab
    await page.click('text=Tests');
    
    // Wait for Monaco Editor to load
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    
    // Add test script
    const testScript = `
// Test status code
pm.test('Status code is 200', () => {
  pm.expect(pm.response).to.have.status(200);
});

// Test response time
pm.test('Response time is less than 1000ms', () => {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});

// Test response body
pm.test('Response has slideshow property', () => {
  pm.expect(pm.response.body).to.have.property('slideshow');
});

// Test array in response
pm.test('Slides is an array', () => {
  pm.expect(pm.response.body.slideshow.slides).to.be.an('array');
});

// Console logging
console.log('Response received:', pm.response.code);
alert('Tests completed!');
`;
    
    // Type in Monaco Editor (tests)
    await page.click('.monaco-editor');
    await page.keyboard.type(testScript);
    
    // Send the request
    await page.click('button:has-text("Send")');
    
    // Wait for response and test results
    await page.waitForSelector('text=Test Results', { timeout: 10000 });
    
    // Check test results
    await page.click('text=Test Results');
    
    // Verify all tests passed
    await expect(page.locator('text=Status code is 200')).toBeVisible();
    await expect(page.locator('text=✓').first()).toBeVisible(); // Check for pass mark
    
    await expect(page.locator('text=Response time is less than 1000ms')).toBeVisible();
    await expect(page.locator('text=Response has slideshow property')).toBeVisible();
    await expect(page.locator('text=Slides is an array')).toBeVisible();
    
    // Check console output
    await page.click('text=Console');
    await expect(page.locator('text=Response received: 200')).toBeVisible();
    await expect(page.locator('text=[ALERT] Tests completed!')).toBeVisible();
  });

  test('should use script examples from dropdown', async ({ page }) => {
    // Create a new collection
    await page.click('text=New Collection');
    await page.fill('input[placeholder="My API Collection"]', 'Example Scripts Collection');
    await page.click('button:has-text("Create")');
    
    // Add a new request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'Example Script Request');
    await page.click('button:has-text("Add")');
    
    // Click on the request to open it
    await page.click('text=Example Script Request');
    
    // Navigate to Pre-request Script tab
    await page.click('text=Pre-request Script');
    
    // Click Examples dropdown
    await page.click('button:has-text("Examples")');
    
    // Select "Generate Timestamp" example
    await page.click('text=Generate Timestamp');
    
    // Verify script was inserted
    await page.waitForSelector('.monaco-editor', { state: 'visible' });
    await expect(page.locator('text=Generate current timestamp')).toBeVisible();
    
    // Navigate to Tests tab
    await page.click('text=Tests');
    
    // Click Examples dropdown for tests
    await page.click('button:has-text("Examples")');
    
    // Select "Test Status Code" example
    await page.click('text=Test Status Code');
    
    // Verify test script was inserted
    await expect(page.locator('text=Test for successful response')).toBeVisible();
  });

  test('should handle script errors gracefully', async ({ page }) => {
    // Create a new collection
    await page.click('text=New Collection');
    await page.fill('input[placeholder="My API Collection"]', 'Error Test Collection');
    await page.click('button:has-text("Create")');
    
    // Add a new request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'Script Error Request');
    await page.click('button:has-text("Add")');
    
    // Click on the request to open it
    await page.click('text=Script Error Request');
    
    // Set request URL
    await page.fill('input[placeholder="Enter request URL"]', 'https://httpbin.org/status/404');
    
    // Navigate to Tests tab
    await page.click('text=Tests');
    
    // Add test script with intentional failures
    const errorScript = `
// This test should fail
pm.test('Status code is 200', () => {
  pm.expect(pm.response).to.have.status(200);
});

// This test should pass
pm.test('Status code is 404', () => {
  pm.expect(pm.response).to.have.status(404);
});

// This will cause a runtime error
pm.test('Test with error', () => {
  nonExistentFunction();
});
`;
    
    // Type in Monaco Editor
    await page.click('.monaco-editor');
    await page.keyboard.type(errorScript);
    
    // Send the request
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('text=Test Results', { timeout: 10000 });
    
    // Check test results
    await page.click('text=Test Results');
    
    // Verify failed test shows error
    await expect(page.locator('text=Status code is 200')).toBeVisible();
    await expect(page.locator('text=✗').first()).toBeVisible(); // Check for fail mark
    
    // Verify passed test
    await expect(page.locator('text=Status code is 404')).toBeVisible();
    await expect(page.locator('text=✓')).toBeVisible();
    
    // Verify error test
    await expect(page.locator('text=Test with error')).toBeVisible();
    await expect(page.locator('text=nonExistentFunction is not defined')).toBeVisible();
  });

  test('should persist responses when navigating between requests', async ({ page }) => {
    // Create a collection with multiple requests
    await page.click('text=New Collection');
    await page.fill('input[placeholder="My API Collection"]', 'Response Persistence Collection');
    await page.click('button:has-text("Create")');
    
    // Add first request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'Request 1');
    await page.click('button:has-text("Add")');
    
    // Add second request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'Request 2');
    await page.click('button:has-text("Add")');
    
    // Execute first request
    await page.click('text=Request 1');
    await page.fill('input[placeholder="Enter request URL"]', 'https://httpbin.org/uuid');
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('text=Response', { timeout: 10000 });
    await page.waitForSelector('text="uuid"', { timeout: 5000 });
    
    // Get the UUID value
    const uuid1 = await page.locator('.monaco-editor').last().textContent();
    
    // Switch to second request
    await page.click('text=Request 2');
    await page.fill('input[placeholder="Enter request URL"]', 'https://httpbin.org/json');
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('text=slideshow', { timeout: 10000 });
    
    // Switch back to first request
    await page.click('text=Request 1');
    
    // Verify the response is still there
    await expect(page.locator('text="uuid"')).toBeVisible();
    const uuid2 = await page.locator('.monaco-editor').last().textContent();
    expect(uuid1).toBe(uuid2); // Response should be the same
  });
});