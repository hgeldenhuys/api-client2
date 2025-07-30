# API Client Tests

This directory contains end-to-end tests for the API Client application using Playwright.

## Running Tests

First, make sure the development server is running:
```bash
bun run dev
```

Then run the tests:

```bash
# Run all tests
bun run test

# Run tests with UI mode (interactive)
bun run test:ui

# Run tests in headed mode (see browser)
bun run test:headed

# Run specific test file
bun run test tests/script-functionality.test.ts
```

## Test Coverage

The script functionality tests cover:

1. **Pre-request Scripts**
   - Setting environment variables
   - Console logging
   - Script execution before request

2. **Test Scripts**
   - Running assertions on responses
   - Displaying test results
   - Handling test failures
   - Console and alert support

3. **Script Examples**
   - Using example scripts from dropdown
   - Inserting pre-built script templates

4. **Error Handling**
   - Graceful handling of script errors
   - Displaying error messages in test results

5. **Response Persistence**
   - Maintaining response data when switching between requests
   - Per-request response storage

## Writing New Tests

When adding new tests:
1. Use descriptive test names
2. Set up test data (collections, requests) in beforeEach or within tests
3. Use appropriate timeouts for network requests
4. Clean up test data if needed
5. Use data-testid attributes for reliable element selection