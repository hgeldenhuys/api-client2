import { test, expect } from '@playwright/test';

test.describe('Authentication Inputs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Create a new request first to ensure we have the request builder interface
    await page.click('text="New Request"');
    await page.waitForTimeout(500); // Wait for UI to settle
  });

  test('should allow editing Bearer token input', async ({ page }) => {
    // Click on Auth tab using the TabsTrigger
    await page.click('button[role="tab"][value="auth"]');
    
    // Select Bearer Token auth type
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("Bearer Token")');
    
    // Wait for the Bearer token input to be visible
    await page.waitForSelector('#bearer-token', { state: 'visible' });
    
    // Try to type in the Bearer token input
    const bearerInput = page.locator('#bearer-token');
    
    // Check if the input is editable
    const isDisabled = await bearerInput.isDisabled();
    expect(isDisabled).toBe(false);
    
    // Clear and type a new value
    await bearerInput.click();
    await bearerInput.fill('');
    await bearerInput.type('my-test-token-123');
    
    // Verify the value was entered
    const value = await bearerInput.inputValue();
    expect(value).toBe('my-test-token-123');
  });

  test('should allow editing Basic Auth inputs', async ({ page }) => {
    // Click on Auth tab using the TabsTrigger
    await page.click('button[role="tab"][value="auth"]');
    
    // Select Basic Auth type
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("Basic Auth")');
    
    // Wait for the Basic Auth inputs to be visible
    await page.waitForSelector('#basic-username', { state: 'visible' });
    await page.waitForSelector('#basic-password', { state: 'visible' });
    
    // Test username input
    const usernameInput = page.locator('#basic-username');
    const isUsernameDisabled = await usernameInput.isDisabled();
    expect(isUsernameDisabled).toBe(false);
    
    await usernameInput.click();
    await usernameInput.fill('testuser');
    const usernameValue = await usernameInput.inputValue();
    expect(usernameValue).toBe('testuser');
    
    // Test password input
    const passwordInput = page.locator('#basic-password');
    const isPasswordDisabled = await passwordInput.isDisabled();
    expect(isPasswordDisabled).toBe(false);
    
    await passwordInput.click();
    await passwordInput.fill('testpass123');
    const passwordValue = await passwordInput.inputValue();
    expect(passwordValue).toBe('testpass123');
  });

  test('should allow editing API Key inputs', async ({ page }) => {
    // Click on Auth tab using the TabsTrigger
    await page.click('button[role="tab"][value="auth"]');
    
    // Select API Key auth type
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("API Key")');
    
    // Wait for the API Key inputs to be visible
    await page.waitForSelector('#apikey-key', { state: 'visible' });
    await page.waitForSelector('#apikey-value', { state: 'visible' });
    
    // Test key name input
    const keyInput = page.locator('#apikey-key');
    await keyInput.click();
    await keyInput.fill('X-API-Key');
    const keyValue = await keyInput.inputValue();
    expect(keyValue).toBe('X-API-Key');
    
    // Test value input
    const valueInput = page.locator('#apikey-value');
    await valueInput.click();
    await valueInput.fill('my-secret-api-key');
    const apiValue = await valueInput.inputValue();
    expect(apiValue).toBe('my-secret-api-key');
  });

  test('should preserve auth values when switching between auth types', async ({ page }) => {
    // Click on Auth tab using the TabsTrigger
    await page.click('button[role="tab"][value="auth"]');
    
    // Set Bearer token
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("Bearer Token")');
    await page.locator('#bearer-token').fill('bearer-token-value');
    
    // Switch to Basic Auth
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("Basic Auth")');
    await page.locator('#basic-username').fill('basic-user');
    await page.locator('#basic-password').fill('basic-pass');
    
    // Switch back to Bearer Token
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("Bearer Token")');
    
    // Check if the Bearer token value is still there
    const bearerValue = await page.locator('#bearer-token').inputValue();
    expect(bearerValue).toBe('bearer-token-value');
  });

  test('should support variable substitution in auth inputs', async ({ page }) => {
    // Click on Auth tab using the TabsTrigger
    await page.click('button[role="tab"][value="auth"]');
    
    // Select Bearer Token auth type
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("Bearer Token")');
    
    // Enter a variable in the Bearer token input
    const bearerInput = page.locator('#bearer-token');
    await bearerInput.click();
    await bearerInput.fill('{{authToken}}');
    
    // Verify the variable syntax is preserved
    const value = await bearerInput.inputValue();
    expect(value).toBe('{{authToken}}');
  });
});