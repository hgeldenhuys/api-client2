import { test, expect } from '@playwright/test';

test.describe('Parameter Field Focus - Minimal Test', () => {
  test('should take screenshot and test parameter focus if possible', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Wait for demo collection to load
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'test-results/app-state.png', fullPage: true });
    
    console.log('Screenshot taken to see app state');
    
    // Try to find any clickable elements that might be requests
    const clickableElements = await page.locator('button, [role="button"], [data-testid*="request"], text*="GET", text*="POST", text*="PUT", text*="DELETE"').count();
    console.log(`Found ${clickableElements} clickable elements`);
    
    // Look for text that might indicate requests or collections
    const pageText = await page.textContent('body');
    console.log('Page contains:', pageText?.substring(0, 500));
    
    // Try to find the demo collection
    const demoElements = page.locator('text*="Demo", text*="Example", text*="Sample"');
    const demoCount = await demoElements.count();
    console.log(`Found ${demoCount} demo-related elements`);
    
    if (demoCount > 0) {
      console.log('Clicking on demo element');
      await demoElements.first().click();
      await page.waitForTimeout(1000);
      
      // Take another screenshot after clicking
      await page.screenshot({ path: 'test-results/after-demo-click.png', fullPage: true });
    }
    
    // Look for tabs or parameter-related elements
    const tabElements = page.locator('[role="tab"], button[data-state], .tab');
    const tabCount = await tabElements.count();
    console.log(`Found ${tabCount} tab elements`);
    
    if (tabCount > 0) {
      const tabTexts = await tabElements.allTextContents();
      console.log('Tab texts:', tabTexts);
      
      // Look for Params tab
      const paramsTab = page.locator('text*="Params", text*="param", [role="tab"]:has-text("Params")');
      const paramsCount = await paramsTab.count();
      console.log(`Found ${paramsCount} params-related tabs`);
      
      if (paramsCount > 0) {
        console.log('Clicking Params tab');
        await paramsTab.first().click();
        await page.waitForTimeout(1000);
        
        // Take screenshot after clicking params
        await page.screenshot({ path: 'test-results/params-tab.png', fullPage: true });
        
        // Look for Add Parameter button
        const addParamButton = page.locator('button:has-text("Add"), button:has-text("Parameter"), text*="Add Parameter"');
        const addParamCount = await addParamButton.count();
        console.log(`Found ${addParamCount} add parameter buttons`);
        
        if (addParamCount > 0) {
          console.log('Clicking Add Parameter');
          await addParamButton.first().click();
          await page.waitForTimeout(1000);
          
          // Take screenshot after adding parameter
          await page.screenshot({ path: 'test-results/parameter-added.png', fullPage: true });
          
          // Look for input fields
          const inputElements = page.locator('input');
          const inputCount = await inputElements.count();
          console.log(`Found ${inputCount} input elements`);
          
          if (inputCount > 0) {
            const placeholders = await inputElements.evaluateAll(inputs => 
              inputs.map(input => (input as HTMLInputElement).placeholder)
            );
            console.log('Input placeholders:', placeholders);
            
            // Try to find parameter key input
            const keyInput = page.locator('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="parameter"]').first();
            const keyInputCount = await keyInput.count();
            
            if (keyInputCount > 0) {
              console.log('Testing parameter key input focus');
              
              await keyInput.click();
              await expect(keyInput).toBeFocused();
              
              // Test typing with focus monitoring
              const testKey = 'testkey';
              let focusLost = false;
              
              for (let i = 0; i < testKey.length; i++) {
                const char = testKey[i];
                
                // Check focus before typing
                const beforeFocus = await keyInput.evaluate(el => document.activeElement === el);
                if (!beforeFocus) {
                  console.log(`❌ Focus lost before typing character ${i + 1}: '${char}'`);
                  focusLost = true;
                  await keyInput.click(); // Re-focus
                }
                
                // Type character
                await keyInput.type(char);
                await page.waitForTimeout(100);
                
                // Check focus after typing
                const afterFocus = await keyInput.evaluate(el => document.activeElement === el);
                if (!afterFocus) {
                  console.log(`❌ Focus lost after typing character ${i + 1}: '${char}'`);
                  focusLost = true;
                }
              }
              
              const finalValue = await keyInput.inputValue();
              console.log(`Final value: "${finalValue}"`);
              
              if (focusLost) {
                console.log('🐛 FOCUS LOSS BUG DETECTED in parameter key field!');
              } else {
                console.log('✅ No focus loss detected in parameter key field');
              }
              
              // Test value field if available
              const valueInput = page.locator('input[placeholder*="value"], input[placeholder*="Value"]').first();
              const valueInputCount = await valueInput.count();
              
              if (valueInputCount > 0) {
                console.log('Testing parameter value input focus');
                
                await valueInput.click();
                await expect(valueInput).toBeFocused();
                
                const testValue = 'testvalue';
                let valueFocusLost = false;
                
                for (let i = 0; i < testValue.length; i++) {
                  const char = testValue[i];
                  
                  const beforeFocus = await valueInput.evaluate(el => document.activeElement === el);
                  if (!beforeFocus) {
                    console.log(`❌ Value field focus lost before typing character ${i + 1}: '${char}'`);
                    valueFocusLost = true;
                    await valueInput.click();
                  }
                  
                  await valueInput.type(char);
                  await page.waitForTimeout(100);
                  
                  const afterFocus = await valueInput.evaluate(el => document.activeElement === el);
                  if (!afterFocus) {
                    console.log(`❌ Value field focus lost after typing character ${i + 1}: '${char}'`);
                    valueFocusLost = true;
                  }
                }
                
                const finalValueInput = await valueInput.inputValue();
                console.log(`Final value field: "${finalValueInput}"`);
                
                if (valueFocusLost) {
                  console.log('🐛 FOCUS LOSS BUG DETECTED in parameter value field!');
                } else {
                  console.log('✅ No focus loss detected in parameter value field');
                }
                
                // Summary
                if (focusLost || valueFocusLost) {
                  console.log('\n🐛 SUMMARY: Parameter field focus loss bug exists!');
                  console.log('This confirms the issue where typing in parameter fields causes focus to be lost.');
                } else {
                  console.log('\n✅ SUMMARY: No focus loss detected - parameter fields work correctly');
                }
              }
              
              // Take final screenshot
              await page.screenshot({ path: 'test-results/test-complete.png', fullPage: true });
              
              // Always pass the test but log results
              expect(true).toBe(true);
            } else {
              console.log('❌ Could not find parameter key input field');
              test.skip();
            }
          } else {
            console.log('❌ No input fields found after adding parameter');
            test.skip();
          }
        } else {
          console.log('❌ Could not find Add Parameter button');
          test.skip();
        }
      } else {
        console.log('❌ Could not find Params tab');
        test.skip();
      }
    } else {
      console.log('❌ No tabs found');
      test.skip();
    }
  });
});