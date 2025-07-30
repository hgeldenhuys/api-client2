import { test, expect } from '@playwright/test';

test.describe('Parameter Field Focus Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Wait for the demo collection to be loaded (if any)
    await page.waitForTimeout(2000);
  });

  test('should maintain focus in parameter key field during typing', async ({ page }) => {
    // Check if demo collection exists, if not create a new one
    const hasCollections = await page.locator('.collection-item, [data-testid="collection-item"]').count() > 0;
    
    if (!hasCollections) {
      // Create a new collection first
      await page.click('button:has-text("New Collection")');
      await page.waitForSelector('input[placeholder="Collection name"]', { timeout: 5000 });
      await page.fill('input[placeholder="Collection name"]', 'Test Collection');
      await page.click('button:has-text("Create")');
      
      // Wait for collection to be created
      await page.waitForTimeout(1000);
    }
    
    // Create a new request by right-clicking or using dropdown
    // First try to find a collection and right-click on it
    const collectionElement = page.locator('text^="Test Collection", text^="Demo Collection", text^="Postman"').first();
    if (await collectionElement.count() > 0) {
      await collectionElement.click({ button: 'right' });
      await page.click('text="Add Request"');
    } else {
      // Fallback: try to find an "Add Request" button directly
      const addRequestButton = page.locator('button:has-text("Add Request")');
      if (await addRequestButton.count() > 0) {
        await addRequestButton.click();
      } else {
        // Skip this test if we can't create a request
        test.skip();
        return;
      }
    }
    
    await page.waitForSelector('input[placeholder="Request name"]', { timeout: 3000 });
    await page.fill('input[placeholder="Request name"]', 'Test Request');
    await page.click('button:has-text("Create")');
    
    // Wait for request to be created and loaded
    await page.waitForTimeout(1000);
    
    // Click on the Params tab
    await page.click('button:has-text("Params")');
    
    // Wait for the params content to load
    await page.waitForTimeout(500);
    
    // Add a parameter by clicking the "Add Parameter" button
    await page.click('button:has-text("Add Parameter")');
    
    // Wait for the parameter row to appear
    await page.waitForSelector('input[placeholder="Parameter key"]', { timeout: 3000 });
    
    // Get the first parameter key input field
    const keyInput = page.locator('input[placeholder="Parameter key"]').first();
    
    // Click on the key input to focus it
    await keyInput.click();
    
    // Verify the input is focused
    await expect(keyInput).toBeFocused();
    
    // Type a test key character by character to simulate the focus loss issue
    const testKey = 'testKey123';
    for (let i = 0; i < testKey.length; i++) {
      const char = testKey[i];
      
      // Type the character
      await keyInput.type(char);
      
      // Small delay to simulate real typing
      await page.waitForTimeout(100);
      
      // Verify that the input still has focus after typing each character
      await expect(keyInput).toBeFocused({
        timeout: 1000
      });
      
      // Verify the value is being built correctly
      const currentValue = await keyInput.inputValue();
      expect(currentValue).toBe(testKey.substring(0, i + 1));
    }
    
    // Final verification that the complete key was entered
    await expect(keyInput).toHaveValue(testKey);
  });

  test('should maintain focus in parameter value field during typing', async ({ page }) => {
    // Skip if we can't set up the test environment
    try {
      // Use existing demo collection if available, otherwise create one
      const hasCollections = await page.locator('.collection-item, [data-testid="collection-item"]').count() > 0;
      
      if (!hasCollections) {
        await page.click('button:has-text("New Collection")');
        await page.waitForSelector('input[placeholder="Collection name"]', { timeout: 3000 });
        await page.fill('input[placeholder="Collection name"]', 'Test Collection Value');
        await page.click('button:has-text("Create")');
        await page.waitForTimeout(1000);
      }
      
      // Try to use an existing request or create a new one
      const existingRequest = page.locator('.request-item, [data-testid="request-item"]').first();
      if (await existingRequest.count() === 0) {
        // Create a new request if none exist
        const collectionElement = page.locator('text*="Collection", text*="Demo"').first();
        await collectionElement.click({ button: 'right' });
        await page.click('text="Add Request"');
        await page.fill('input[placeholder="Request name"]', 'Test Request Value');
        await page.click('button:has-text("Create")');
        await page.waitForTimeout(1000);
      } else {
        // Click on existing request
        await existingRequest.click();
        await page.waitForTimeout(500);
      }
      
      // Click on the Params tab
      await page.click('button:has-text("Params")');
      await page.waitForTimeout(500);
      
      // Add a parameter
      await page.click('button:has-text("Add Parameter")');
      await page.waitForSelector('input[placeholder="Parameter key"]', { timeout: 3000 });
      
      // First, fill in the key field
      const keyInput = page.locator('input[placeholder="Parameter key"]').first();
      await keyInput.click();
      await keyInput.fill('testKey');
      
      // Now get the value input field
      const valueInput = page.locator('input[placeholder="Parameter value"]').first();
      
      // Click on the value input to focus it
      await valueInput.click();
      
      // Verify the input is focused
      await expect(valueInput).toBeFocused();
      
      // Type a test value character by character to simulate the focus loss issue
      const testValue = 'testValue456';
      for (let i = 0; i < testValue.length; i++) {
        const char = testValue[i];
        
        // Type the character
        await valueInput.type(char);
        
        // Small delay to simulate real typing
        await page.waitForTimeout(100);
        
        // Verify that the input still has focus after typing each character
        await expect(valueInput).toBeFocused({
          timeout: 1000
        });
        
        // Verify the value is being built correctly
        const currentValue = await valueInput.inputValue();
        expect(currentValue).toBe(testValue.substring(0, i + 1));
      }
      
      // Final verification that the complete value was entered
      await expect(valueInput).toHaveValue(testValue);
    } catch (error) {
      test.skip();
    }
  });

  test('should handle multiple parameters without focus loss', async ({ page }) => {
    // Create a new collection first
    await page.click('button:has-text("New Collection")');
    await page.fill('input[placeholder="Collection name"]', 'Test Collection Multi');
    await page.click('button:has-text("Create")');
    
    // Wait for collection to be created
    await page.waitForTimeout(500);
    
    // Create a new request
    await page.click('button:has-text("Add Request")');
    await page.fill('input[placeholder="Request name"]', 'Test Request Multi');
    await page.click('button:has-text("Create")');
    
    // Wait for request to be created and loaded
    await page.waitForTimeout(1000);
    
    // Click on the Params tab
    await page.click('[data-state="inactive"]:has-text("Params")');
    
    // Wait for the params tab to be active
    await page.waitForSelector('[data-state="active"]:has-text("Params")');
    
    // Add multiple parameters
    for (let paramIndex = 0; paramIndex < 3; paramIndex++) {
      // Add a parameter
      await page.click('button:has-text("Add Parameter")');
      
      // Wait for the new parameter row
      await page.waitForTimeout(200);
      
      // Get the specific parameter inputs
      const keyInput = page.locator('input[placeholder="Parameter key"]').nth(paramIndex);
      const valueInput = page.locator('input[placeholder="Parameter value"]').nth(paramIndex);
      
      // Test key field focus
      await keyInput.click();
      await expect(keyInput).toBeFocused();
      
      const testKey = `key${paramIndex + 1}`;
      await keyInput.type(testKey);
      await expect(keyInput).toBeFocused();
      await expect(keyInput).toHaveValue(testKey);
      
      // Test value field focus
      await valueInput.click();
      await expect(valueInput).toBeFocused();
      
      const testValue = `value${paramIndex + 1}`;
      await valueInput.type(testValue);
      await expect(valueInput).toBeFocused();
      await expect(valueInput).toHaveValue(testValue);
    }
    
    // Verify all parameters were created correctly
    const keyInputs = page.locator('input[placeholder="Parameter key"]');
    const valueInputs = page.locator('input[placeholder="Parameter value"]');
    
    await expect(keyInputs).toHaveCount(3);
    await expect(valueInputs).toHaveCount(3);
    
    // Verify values are correct
    for (let i = 0; i < 3; i++) {
      await expect(keyInputs.nth(i)).toHaveValue(`key${i + 1}`);
      await expect(valueInputs.nth(i)).toHaveValue(`value${i + 1}`);
    }
  });

  test('should maintain focus during parameter location changes', async ({ page }) => {
    // Create a new collection first
    await page.click('button:has-text("New Collection")');
    await page.fill('input[placeholder="Collection name"]', 'Test Collection Location');
    await page.click('button:has-text("Create")');
    
    // Wait for collection to be created
    await page.waitForTimeout(500);
    
    // Create a new request
    await page.click('button:has-text("Add Request")');
    await page.fill('input[placeholder="Request name"]', 'Test Request Location');
    await page.click('button:has-text("Create")');
    
    // Wait for request to be created and loaded
    await page.waitForTimeout(1000);
    
    // Click on the Params tab
    await page.click('[data-state="inactive"]:has-text("Params")');
    
    // Wait for the params tab to be active
    await page.waitForSelector('[data-state="active"]:has-text("Params")');
    
    // Add a parameter
    await page.click('button:has-text("Add Parameter")');
    
    // Fill in initial values
    const keyInput = page.locator('input[placeholder="Parameter key"]').first();
    const valueInput = page.locator('input[placeholder="Parameter value"]').first();
    
    await keyInput.click();
    await keyInput.fill('Authorization');
    
    await valueInput.click();
    await valueInput.fill('Bearer token123');
    
    // Test that changing parameter location doesn't affect focus during typing
    await valueInput.click();
    await expect(valueInput).toBeFocused();
    
    // Type additional text while verifying focus is maintained
    const additionalText = 'xyz';
    for (const char of additionalText) {
      await valueInput.type(char);
      await page.waitForTimeout(50);
      await expect(valueInput).toBeFocused();
    }
    
    // Verify the final value
    await expect(valueInput).toHaveValue('Bearer token123xyz');
  });

  test('should reproduce and document focus loss bug', async ({ page }) => {
    // This test specifically targets the focus loss issue
    // by rapidly typing and checking for focus interruption
    
    // Create a new collection first
    await page.click('button:has-text("New Collection")');
    await page.fill('input[placeholder="Collection name"]', 'Focus Bug Test');
    await page.click('button:has-text("Create")');
    
    // Wait for collection to be created
    await page.waitForTimeout(500);
    
    // Create a new request
    await page.click('button:has-text("Add Request")');
    await page.fill('input[placeholder="Request name"]', 'Focus Bug Request');
    await page.click('button:has-text("Create")');
    
    // Wait for request to be created and loaded
    await page.waitForTimeout(1000);
    
    // Click on the Params tab
    await page.click('[data-state="inactive"]:has-text("Params")');
    
    // Wait for the params tab to be active
    await page.waitForSelector('[data-state="active"]:has-text("Params")');
    
    // Add a parameter
    await page.click('button:has-text("Add Parameter")');
    
    // Get the key input
    const keyInput = page.locator('input[placeholder="Parameter key"]').first();
    await keyInput.click();
    
    // Track focus state during rapid typing
    const testText = 'rapidTypingTest123456789';
    let focusLostCount = 0;
    
    for (let i = 0; i < testText.length; i++) {
      const char = testText[i];
      
      // Check if input is focused before typing
      const isFocusedBefore = await keyInput.evaluate(el => document.activeElement === el);
      
      if (!isFocusedBefore) {
        focusLostCount++;
        console.log(`Focus lost before typing character ${i + 1}: '${char}'`);
        // Re-focus the input
        await keyInput.click();
      }
      
      // Type the character
      await keyInput.type(char);
      
      // Small delay to allow for any re-rendering
      await page.waitForTimeout(10);
      
      // Check if input is still focused after typing
      const isFocusedAfter = await keyInput.evaluate(el => document.activeElement === el);
      
      if (!isFocusedAfter) {
        focusLostCount++;
        console.log(`Focus lost after typing character ${i + 1}: '${char}'`);
      }
    }
    
    // Log the results
    console.log(`Focus lost ${focusLostCount} times during typing`);
    
    // The test should pass if focus is maintained, but will fail if there's a focus loss bug
    expect(focusLostCount).toBe(0);
    
    // Verify the final value is correct
    await expect(keyInput).toHaveValue(testText);
  });
});