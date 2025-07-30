// Simple header test using browser automation
import puppeteer from 'puppeteer';

(async () => {
  console.log('🔧 Testing header functionality...');
  
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:5174');
    await page.waitForTimeout(3000);
    
    // Select a request
    await page.click('text/Get Users');
    await page.waitForTimeout(1000);
    
    // Go to Headers tab
    await page.click('button:has-text("Headers")');
    await page.waitForTimeout(1000);
    
    // Count initial headers
    const initialCount = await page.$$eval('input[placeholder="Key"]', els => els.length);
    console.log(`Initial headers: ${initialCount}`);
    
    // Click Add Header
    await page.click('button:has-text("Add Header")');
    await page.waitForTimeout(2000);
    
    // Count after adding
    const newCount = await page.$$eval('input[placeholder="Key"]', els => els.length);
    console.log(`Headers after add: ${newCount}`);
    
    if (newCount > initialCount) {
      console.log('✅ SUCCESS: Header was added and persists!');
      
      // Try typing in the new header
      const keyInputs = await page.$$('input[placeholder="Key"]');
      const lastKeyInput = keyInputs[keyInputs.length - 1];
      
      await lastKeyInput.click();
      await lastKeyInput.type('X-Test-Header');
      await page.waitForTimeout(1000);
      
      const value = await lastKeyInput.evaluate(el => el.value);
      console.log(`Typed value: "${value}"`);
      
      if (value === 'X-Test-Header') {
        console.log('✅ SUCCESS: Typing in header works correctly!');
      } else {
        console.log('❌ ISSUE: Typing did not work correctly');
      }
    } else {
      console.log('❌ ISSUE: Header was not added or disappeared');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
  
  console.log('Test completed. Browser will stay open for manual verification.');
  // Don't close browser so user can manually verify
  // await browser.close();
})();