import { test, expect } from '@playwright/test';

test.describe('Auth Password and Preview Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Create a new request
    await page.click('text="New Request"');
    await page.waitForTimeout(500);
  });

  test('password inputs should be masked with bullets', async ({ page }) => {
    // Navigate to Auth tab
    await page.click('button[role="tab"][value="auth"]');
    
    // Select Bearer Token
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("Bearer Token")');
    
    // Type in the bearer token input
    const bearerInput = page.locator('#bearer-token');
    await bearerInput.click();
    await bearerInput.fill('my-secret-token-123');
    
    // Check that the display layer shows bullets
    // The actual input value should be the real text
    const inputValue = await bearerInput.inputValue();
    expect(inputValue).toBe('my-secret-token-123');
    
    // Check that bullets are displayed (19 bullets for 19 characters)
    const displayLayer = page.locator('#bearer-token').locator('..').locator('div').nth(1);
    const displayText = await displayLayer.textContent();
    expect(displayText).toBe('•'.repeat(19));
    
    // Click Show Secrets button
    await page.click('button:has-text("Show Secrets")');
    
    // Now the display should show the actual text
    const displayTextAfterShow = await displayLayer.textContent();
    expect(displayTextAfterShow).toBe('my-secret-token-123');
  });

  test('preview button should work with variables', async ({ page }) => {
    // First, create an environment variable
    await page.click('button:has-text("Environments")');
    await page.click('button:has-text("Manage")');
    
    // Add a new environment
    await page.click('button:has-text("New Environment")');
    await page.fill('input[placeholder="Environment name"]', 'Test Env');
    
    // Add a variable
    await page.click('button:has-text("Add Variable")');
    await page.fill('input[placeholder="Variable name"]').first(), 'authToken');
    await page.fill('input[placeholder="Value"]').first(), 'secret-token-value');
    
    // Save and close
    await page.click('button:has-text("Save")');
    await page.click('button[aria-label="Close"]');
    
    // Navigate to Auth tab
    await page.click('button[role="tab"][value="auth"]');
    
    // Select Bearer Token
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("Bearer Token")');
    
    // Type a variable reference
    const bearerInput = page.locator('#bearer-token');
    await bearerInput.click();
    await bearerInput.fill('{{authToken}}');
    
    // Click the preview button (eye icon)
    const previewButton = page.locator('button:has(svg)').filter({ hasText: /Preview/ });
    await previewButton.click();
    
    // In preview mode, the variable should be resolved
    const displayLayer = page.locator('#bearer-token').locator('..').locator('div').nth(1);
    const previewText = await displayLayer.textContent();
    expect(previewText).toContain('secret-token-value');
  });

  test('Basic Auth fields should mask password but not username', async ({ page }) => {
    // Navigate to Auth tab
    await page.click('button[role="tab"][value="auth"]');
    
    // Select Basic Auth
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("Basic Auth")');
    
    // Type username - should not be masked
    const usernameInput = page.locator('#basic-username');
    await usernameInput.click();
    await usernameInput.fill('myusername');
    
    const usernameDisplay = usernameInput.locator('..').locator('div').nth(1);
    const usernameText = await usernameDisplay.textContent();
    expect(usernameText).toBe('myusername');
    
    // Type password - should be masked
    const passwordInput = page.locator('#basic-password');
    await passwordInput.click();
    await passwordInput.fill('mypassword');
    
    const passwordDisplay = passwordInput.locator('..').locator('div').nth(1);
    const passwordText = await passwordDisplay.textContent();
    expect(passwordText).toBe('•'.repeat(10)); // 10 bullets for "mypassword"
  });
});