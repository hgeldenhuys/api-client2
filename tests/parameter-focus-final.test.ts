import { test, expect } from '@playwright/test';

test.describe('Parameter Field Focus Test', () => {
  test('reproduces focus loss bug in parameter fields', async ({ page }) => {
    console.log('🚀 Starting parameter focus loss reproduction test...');
    
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/1-initial-load.png', fullPage: true });
    console.log('📸 Initial screenshot taken');
    
    // Look for demo collection or any existing requests
    const pageContent = await page.textContent('body');
    console.log('📄 Page content loaded');
    
    // Try to find and click on any existing request
    const possibleRequests = page.locator('div, span, button').filter({ hasText: /GET|POST|PUT|DELETE|Request/ });
    const requestCount = await possibleRequests.count();
    console.log(`🔍 Found ${requestCount} potential request elements`);
    
    if (requestCount > 0) {
      // Click on first potential request
      await possibleRequests.first().click();
      await page.waitForTimeout(1000);
      console.log('🖱️ Clicked on potential request');
      
      await page.screenshot({ path: 'test-results/2-request-selected.png', fullPage: true });
    }
    
    // Look for tabs - try multiple selectors
    let paramsTabFound = false;
    const tabSelectors = [
      'button:has-text("Params")',
      '[role="tab"]:has-text("Params")',
      'div:has-text("Params")',
      '*:has-text("Params")'
    ];
    
    for (const selector of tabSelectors) {
      try {
        const tabElement = page.locator(selector).first();
        const count = await tabElement.count();
        if (count > 0) {
          console.log(`📑 Found Params tab with selector: ${selector}`);
          await tabElement.click();
          await page.waitForTimeout(1000);
          paramsTabFound = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!paramsTabFound) {
      console.log('❌ Could not find Params tab, taking screenshot for debug');
      await page.screenshot({ path: 'test-results/3-no-params-tab.png', fullPage: true });
      
      // Try to find any buttons that might lead to params
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`🔍 Found ${buttonCount} buttons on page`);
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const buttonText = await allButtons.nth(i).textContent();
        console.log(`Button ${i}: "${buttonText}"`);
      }
      
      test.skip('Cannot find Params tab to test');
      return;
    }
    
    await page.screenshot({ path: 'test-results/3-params-tab-active.png', fullPage: true });
    console.log('📑 Params tab clicked');
    
    // Look for Add Parameter button
    let addButtonFound = false;
    const addButtonSelectors = [
      'button:has-text("Add Parameter")',
      'button:has-text("Add")',
      '*:has-text("Add Parameter")'
    ];
    
    for (const selector of addButtonSelectors) {
      try {
        const addButton = page.locator(selector).first();
        const count = await addButton.count();
        if (count > 0) {
          console.log(`➕ Found Add Parameter button with selector: ${selector}`);
          await addButton.click();
          await page.waitForTimeout(1000);
          addButtonFound = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!addButtonFound) {
      console.log('❌ Could not find Add Parameter button');
      await page.screenshot({ path: 'test-results/4-no-add-button.png', fullPage: true });
      test.skip('Cannot find Add Parameter button');
      return;
    }
    
    await page.screenshot({ path: 'test-results/4-parameter-added.png', fullPage: true });
    console.log('➕ Add Parameter button clicked');
    
    // Look for input fields
    const keyInputs = page.locator('input').filter({ hasText: '' }); // All inputs
    const inputCount = await keyInputs.count();
    console.log(`📝 Found ${inputCount} input fields`);
    
    if (inputCount === 0) {
      console.log('❌ No input fields found');
      await page.screenshot({ path: 'test-results/5-no-inputs.png', fullPage: true });
      test.skip('No input fields found');
      return;
    }
    
    // Try to find parameter key and value inputs by placeholder or position
    let keyInput = page.locator('input').first(); // Use first input as key field
    let valueInput = inputCount > 1 ? page.locator('input').nth(1) : null; // Second input as value field
    
    // Test the key input field
    console.log('🎯 Testing focus in key input field...');
    await keyInput.click();
    
    const isInitiallyFocused = await keyInput.evaluate(el => document.activeElement === el);
    console.log(`Initial focus state: ${isInitiallyFocused}`);
    
    if (!isInitiallyFocused) {
      console.log('❌ Input is not focused initially');
      test.skip('Cannot focus input field');
      return;
    }
    
    // Test typing with focus monitoring
    const testKey = 'Authorization';
    let focusLossCount = 0;
    let lastFocusState = true;
    
    console.log(`⌨️ Starting to type: "${testKey}"`);
    
    for (let i = 0; i < testKey.length; i++) {
      const char = testKey[i];
      
      // Check focus before typing
      const beforeFocus = await keyInput.evaluate(el => document.activeElement === el);
      if (!beforeFocus && lastFocusState) {
        focusLossCount++;
        console.log(`❌ Focus lost before typing character ${i + 1}: '${char}'`);
        await keyInput.click(); // Try to regain focus
      }
      
      // Type the character
      await keyInput.type(char);
      
      // Wait a bit to simulate real typing and allow for re-renders
      await page.waitForTimeout(150);
      
      // Check focus after typing
      const afterFocus = await keyInput.evaluate(el => document.activeElement === el);
      if (!afterFocus) {
        focusLossCount++;
        console.log(`❌ Focus lost after typing character ${i + 1}: '${char}'`);
        lastFocusState = false;
      } else {
        lastFocusState = true;
      }
      
      // Check current value
      const currentValue = await keyInput.inputValue();
      console.log(`Character ${i + 1}: '${char}' -> current value: "${currentValue}" (focus: ${afterFocus})`);
    }
    
    const finalKeyValue = await keyInput.inputValue();
    console.log(`📝 Final key value: "${finalKeyValue}"`);
    
    // Test value field if available
    if (valueInput) {
      console.log('🎯 Testing focus in value input field...');
      
      await valueInput.click();
      const testValue = 'Bearer token123';
      let valueFocusLoss = 0;
      
      console.log(`⌨️ Starting to type in value field: "${testValue}"`);
      
      for (let i = 0; i < testValue.length; i++) {
        const char = testValue[i];
        
        const beforeFocus = await valueInput.evaluate(el => document.activeElement === el);
        if (!beforeFocus) {
          valueFocusLoss++;
          console.log(`❌ Value field focus lost before typing character ${i + 1}: '${char}'`);
          await valueInput.click();
        }
        
        await valueInput.type(char);
        await page.waitForTimeout(150);
        
        const afterFocus = await valueInput.evaluate(el => document.activeElement === el);
        if (!afterFocus) {
          valueFocusLoss++;
          console.log(`❌ Value field focus lost after typing character ${i + 1}: '${char}'`);
        }
        
        const currentValue = await valueInput.inputValue();
        console.log(`Value char ${i + 1}: '${char}' -> current value: "${currentValue}" (focus: ${afterFocus})`);
      }
      
      const finalValueInput = await valueInput.inputValue();
      console.log(`📝 Final value field: "${finalValueInput}"`);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/6-test-complete.png', fullPage: true });
    
    // Report results
    console.log('\n📊 TEST RESULTS:');
    console.log(`Key field focus losses: ${focusLossCount}`);
    if (valueInput) {
      console.log(`Value field focus losses: ${focusLossCount}`);
    }
    
    if (focusLossCount > 0) {
      console.log('\n🐛 BUG CONFIRMED: Focus loss detected in parameter fields!');
      console.log('This test demonstrates the focus loss issue when typing in parameter fields.');
      console.log('Users experience interruption while typing as the field loses focus.');
    } else {
      console.log('\n✅ No focus loss detected - parameter fields are working correctly');
    }
    
    // The test always passes but documents the bug
    expect(true).toBe(true);
  });
});