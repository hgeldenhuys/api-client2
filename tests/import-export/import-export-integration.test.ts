import { test, expect } from '@playwright/test';

test.describe('Import/Export Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"], .flex.h-screen', { 
      state: 'visible',
      timeout: 10000 
    });
  });

  test('imports OpenAPI file through UI', async ({ page }) => {
    const openApiContent = `{
  "openapi": "3.0.0",
  "info": {
    "title": "Test API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "Get users",
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  }
}`;

    // Click Import button
    await page.click('text=Import');
    
    // Switch to OpenAPI tab
    await page.click('text=OpenAPI');
    
    // Paste OpenAPI content
    await page.fill('textarea[placeholder*="openapi"]', openApiContent);
    
    // Click Import OpenAPI button
    await page.click('button:has-text("Import OpenAPI")');
    
    // Wait for import to complete
    await page.waitForSelector('text=Import Collection', { state: 'hidden', timeout: 5000 });
    
    // Verify collection was created
    await expect(page.locator('text=Test API')).toBeVisible();
    
    // Verify request was imported
    await expect(page.locator('text=Get users')).toBeVisible();
  });

  test('exports collection in different formats', async ({ page }) => {
    // First create a simple collection
    await page.click('text=New Collection');
    await page.fill('input[placeholder="My API Collection"]', 'Export Test Collection');
    await page.click('button:has-text("Create")');
    
    // Add a request
    await page.click('button[title="Add request to collection"]');
    await page.fill('input[placeholder="Enter request name"]', 'Test Request');
    await page.click('button:has-text("Add")');
    
    // Click Export button
    await page.click('text=Export');
    
    // Verify export dialog has format options
    await expect(page.locator('text=Export Format')).toBeVisible();
    await expect(page.locator('text=Postman Collection')).toBeVisible();
    await expect(page.locator('text=OpenAPI/Swagger')).toBeVisible();
    await expect(page.locator('text=HTTP File')).toBeVisible();
    
    // Test OpenAPI export
    await page.selectOption('select', 'openapi');
    
    // Verify OpenAPI version selector appears
    await expect(page.locator('text=OpenAPI Version')).toBeVisible();
    await expect(page.locator('text=OpenAPI 3.0')).toBeVisible();
    
    // Test HTTP export
    await page.selectOption('select', 'http');
    
    // Verify OpenAPI version selector is hidden
    await expect(page.locator('text=OpenAPI Version')).not.toBeVisible();
    
    // Test backup option only appears for Postman format
    await page.selectOption('select', 'postman');
    await expect(page.locator('text=Full Backup')).toBeVisible();
    
    await page.selectOption('select', 'http');
    await expect(page.locator('text=Full Backup')).not.toBeVisible();
  });

  test('validates import formats correctly', async ({ page }) => {
    // Test invalid JSON
    await page.click('text=Import');
    await page.click('text=JSON');
    
    await page.fill('textarea[placeholder*="info"]', 'invalid json{');
    await page.click('button:has-text("Import JSON")');
    
    // Should show error
    await expect(page.locator('text=Invalid JSON format')).toBeVisible();
    
    // Test empty content
    await page.fill('textarea[placeholder*="info"]', '');
    await page.click('button:has-text("Import JSON")');
    
    // Should show error
    await expect(page.locator('text=Please paste a valid JSON')).toBeVisible();
  });

  test('file upload works correctly', async ({ page }) => {
    // Click Import button
    await page.click('text=Import');
    
    // Should be on File tab by default
    await expect(page.locator('text=Click to upload or drag and drop')).toBeVisible();
    
    // Verify supported file types are mentioned
    await expect(page.locator('text=Postman Collections')).toBeVisible();
    await expect(page.locator('text=OpenAPI/Swagger')).toBeVisible();
    await expect(page.locator('text=HTTP files')).toBeVisible();
  });
});