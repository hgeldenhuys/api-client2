import { test, expect } from '@playwright/test';

test.describe('HTTP File Import', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"], .flex.h-screen', { 
      state: 'visible',
      timeout: 10000 
    });
  });

  test('imports HTTP file through UI', async ({ page }) => {
    const httpContent = `### Get Users
GET https://api.example.com/users
Authorization: Bearer token123
Accept: application/json

### Create User
POST https://api.example.com/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}`;

    // Click Import button
    await page.click('text=Import');
    
    // Switch to HTTP tab
    await page.click('text=HTTP');
    
    // Paste HTTP content
    await page.fill('textarea[placeholder*="### Get Users"]', httpContent);
    
    // Click Import HTTP File button
    await page.click('button:has-text("Import HTTP File")');
    
    // Wait for import to complete and dialog to close
    await page.waitForSelector('text=Import Collection', { state: 'hidden', timeout: 5000 });
    
    // Verify collection was created
    await expect(page.locator('text=Imported HTTP Requests')).toBeVisible();
    
    // Verify requests were imported
    await expect(page.locator('text=Get Users')).toBeVisible();
    await expect(page.locator('text=Create User')).toBeVisible();
    
    // Click on first request to verify details
    await page.click('text=Get Users');
    
    // Verify method and URL
    await expect(page.locator('select')).toHaveValue('GET');
    await expect(page.locator('input[value*="api.example.com/users"]')).toBeVisible();
  });

  test('handles JSON body without treating it as headers', async ({ page }) => {
    const httpContent = `### Test Request
POST https://api.example.com/test
Content-Type: application/json

{"test": "this should not be parsed as header"}`;

    // Click Import button
    await page.click('text=Import');
    
    // Switch to HTTP tab
    await page.click('text=HTTP');
    
    // Paste HTTP content
    await page.fill('textarea[placeholder*="### Get Users"]', httpContent);
    
    // Click Import HTTP File button
    await page.click('button:has-text("Import HTTP File")');
    
    // Wait for import to complete
    await page.waitForSelector('text=Import Collection', { state: 'hidden', timeout: 5000 });
    
    // Verify no error about invalid key format
    await expect(page.locator('text=Invalid key format')).not.toBeVisible();
    
    // Verify collection was created
    await expect(page.locator('text=Imported HTTP Requests')).toBeVisible();
    
    // Click on the request
    await page.click('text=Test Request');
    
    // Verify that we only have the proper Content-Type header, not the JSON content
    await page.click('text=Params');
    
    // Should see the Content-Type header
    await expect(page.locator('text=Content-Type')).toBeVisible();
    
    // Click on Body tab to verify JSON is in body, not as parameters
    await page.click('text=Body');
    
    // Should see the JSON content in body
    await expect(page.locator('text="test"')).toBeVisible();
  });
});