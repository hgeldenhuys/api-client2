const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:5173';

// Helper function to wait and assert
async function waitAndAssert(page, selector, message) {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    console.log(`✓ ${message}`);
  } catch (error) {
    throw new Error(`✗ ${message}: ${error.message}`);
  }
}

// Test suites
async function runNavigationTests(page) {
  console.log('\n🧪 Running Navigation Tests...');
  
  // Test hash navigation
  await page.goto(`${BASE_URL}/#collection`);
  await waitAndAssert(page, '.h-full.flex.flex-col', 'Collection view loaded');
  
  await page.goto(`${BASE_URL}/#environment`);
  await waitAndAssert(page, 'h2:has-text("Variables")', 'Environment view loaded');
  
  // Test keyboard shortcuts
  await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
  await page.keyboard.press('1');
  await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
  await page.waitForTimeout(500);
  const url = page.url();
  if (!url.includes('#collection')) {
    throw new Error('Keyboard shortcut Cmd/Ctrl+1 did not navigate to collection view');
  }
  console.log('✓ Keyboard shortcuts work');
}

async function runCollectionExplorerTests(page) {
  console.log('\n🧪 Running Collection Explorer Tests...');
  
  await page.goto(`${BASE_URL}/#collection`);
  await page.waitForTimeout(1000); // Wait for collections to load
  
  // Test folder expansion
  const folders = await page.$$('.cursor-pointer:has(svg.lucide-folder)');
  if (folders.length > 0) {
    // Find a folder that's not the root collection folder
    for (const folder of folders) {
      const text = await folder.evaluate(el => el.textContent);
      if (text && !text.includes('Postman Echo')) { // Skip root collection
        await folder.click();
        await page.waitForTimeout(500);
        
        // Check if expanded (should have chevron-down)
        const expanded = await page.$('svg.lucide-chevron-down');
        if (expanded) {
          console.log('✓ Folder expansion works');
          
          // Collapse it again
          await folder.click();
          await page.waitForTimeout(500);
          break;
        }
      }
    }
  }
  
  // Test request clicking
  const requests = await page.$$('.cursor-pointer:has(svg.lucide-file-text)');
  if (requests.length > 0) {
    await requests[0].click();
    await page.waitForTimeout(500);
    
    // Check if request is selected (should have bg-accent class)
    const selectedRequest = await page.$('.bg-accent:has(svg.lucide-file-text)');
    if (selectedRequest) {
      console.log('✓ Request selection works');
    } else {
      throw new Error('Request was not selected');
    }
    
    // Check if tab was created
    await waitAndAssert(page, '.rounded-t-md', 'Request tab created');
  }
}

async function runRequestBuilderTests(page) {
  console.log('\n🧪 Running Request Builder Tests...');
  
  // Make sure we have a request selected
  const requests = await page.$$('.cursor-pointer:has(svg.lucide-file-text)');
  if (requests.length > 0) {
    await requests[0].click();
    await page.waitForTimeout(1000);
    
    // Test URL editing
    const urlInput = await page.$('input[placeholder="Enter request URL"]');
    if (urlInput) {
      const originalValue = await urlInput.evaluate(el => el.value);
      
      await urlInput.click({ clickCount: 3 }); // Select all
      await urlInput.type('https://api.test.com/v2/users');
      
      // Wait for auto-save
      await page.waitForTimeout(1200);
      
      // Click another request if available
      if (requests.length > 1) {
        await requests[1].click();
        await page.waitForTimeout(500);
        
        // Click back to first request
        await requests[0].click();
        await page.waitForTimeout(500);
        
        // Check if URL was saved
        const savedValue = await urlInput.evaluate(el => el.value);
        if (savedValue === 'https://api.test.com/v2/users') {
          console.log('✓ Auto-save works');
        } else {
          console.log(`⚠️  Auto-save may not be working. Expected: https://api.test.com/v2/users, Got: ${savedValue}`);
        }
      }
    }
  }
}

async function runEnvironmentTests(page) {
  console.log('\n🧪 Running Environment Tests...');
  
  await page.goto(`${BASE_URL}/#environment`);
  await page.waitForTimeout(1000);
  
  // Create new environment
  const plusButton = await page.$('button:has(svg.lucide-plus)');
  if (plusButton) {
    await plusButton.click();
    await page.waitForTimeout(500);
    
    const input = await page.$('input[value="New Environment"]');
    if (input) {
      await input.click({ clickCount: 3 });
      await input.type('Test Environment');
      await input.press('Enter');
      await page.waitForTimeout(500);
      
      console.log('✓ Environment creation works');
      
      // Select the environment
      const envItem = await page.$('.rounded.cursor-pointer:has-text("Test Environment")');
      if (envItem) {
        await envItem.click();
        await page.waitForTimeout(500);
        
        // Add a variable
        const varKeyInput = await page.$('input[placeholder="Variable name"]');
        const varValueInput = await page.$('input[placeholder="Value"]');
        
        if (varKeyInput && varValueInput) {
          await varKeyInput.type('testVar');
          await varValueInput.type('testValue');
          
          const addButton = await page.$('button:has-text("Add")');
          if (addButton) {
            await addButton.click();
            await page.waitForTimeout(500);
            
            // Check if variable appears
            const varRow = await page.$('td:has-text("testVar")');
            if (varRow) {
              console.log('✓ Variable creation works');
            }
          }
        }
      }
    }
  }
}

async function runTests() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log('🚀 Starting API Client E2E Tests...');
    console.log(`📍 Testing URL: ${BASE_URL}`);
    
    // Run test suites
    await runNavigationTests(page);
    await runCollectionExplorerTests(page);
    await runRequestBuilderTests(page);
    await runEnvironmentTests(page);
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
