import { test, expect } from '@playwright/test';

test.describe('Simple Auth Input Test', () => {
  test('Bearer token input should be editable', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Create a new request
    await page.click('text="New Request"');
    await page.waitForTimeout(1000);
    
    // Click on Auth tab
    const authTab = page.locator('button[role="tab"]').filter({ hasText: 'Auth' });
    await authTab.click();
    
    // Wait for auth content to be visible
    await page.waitForSelector('[role="tabpanel"]', { state: 'visible' });
    
    // Select Bearer Token from dropdown
    const authTypeSelect = page.locator('[role="combobox"]').first();
    await authTypeSelect.click();
    
    // Click on Bearer Token option
    await page.click('text="Bearer Token"');
    
    // Wait for the bearer token input to appear
    await page.waitForSelector('input[id="bearer-token"]', { state: 'visible', timeout: 5000 });
    
    // Try to type in the input
    const bearerInput = page.locator('input[id="bearer-token"]');
    
    // Check if input is not disabled
    const isDisabled = await bearerInput.isDisabled();
    console.log('Is bearer input disabled?', isDisabled);
    
    // Type in the input
    await bearerInput.click();
    await bearerInput.fill('test-bearer-token-12345');
    
    // Verify the value
    const inputValue = await bearerInput.inputValue();
    expect(inputValue).toBe('test-bearer-token-12345');
    
    console.log('Successfully entered bearer token:', inputValue);
  });
});