import React from 'react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '~/components/ui/dropdown-menu';
import { ChevronDown, Lightbulb } from 'lucide-react';

interface ScriptExample {
  name: string;
  description: string;
  code: string;
}

interface ScriptExamplesDropdownProps {
  type: 'pre-request' | 'test';
  onSelect: (code: string) => void;
}

const preRequestExamples: ScriptExample[] = [
  {
    name: 'Modify Request Headers',
    description: 'Add or update request headers dynamically',
    code: `// Add authentication header using upsert (updates if exists, adds if not)
const token = pm.environment.get('authToken') || 'your-api-token';
pm.request.headers.upsert({
  key: 'Authorization',
  value: \`Bearer \${token}\`
});

// Add custom headers
pm.request.headers.add({
  key: 'X-API-Version',
  value: 'v2'
});

pm.request.headers.add({
  key: 'X-Request-ID',
  value: Date.now().toString()
});

// Remove a header if needed
// pm.request.headers.remove('User-Agent');

// Check if header exists
if (pm.request.headers.has('Content-Type')) {
  console.log('Content-Type:', pm.request.headers.get('Content-Type'));
}`
  },
  {
    name: 'Set Bearer Token',
    description: 'Set bearer token authentication',
    code: `// Set bearer token authentication
const token = pm.environment.get('access_token');
pm.request.setAuth({
  type: 'bearer',
  bearer: [
    { key: 'token', value: token, type: 'string' }
  ]
});`
  },
  {
    name: 'Set Basic Auth',
    description: 'Set basic authentication',
    code: `// Set basic authentication
pm.request.setAuth({
  type: 'basic',
  basic: [
    { key: 'username', value: pm.environment.get('username'), type: 'string' },
    { key: 'password', value: pm.environment.get('password'), type: 'string' }
  ]
});`
  },
  {
    name: 'Update API Key',
    description: 'Update API key authentication',
    code: `// Update API key authentication
const apiKey = pm.environment.get('api_key');
pm.request.updateAuth('apikey', 'value', apiKey);
pm.request.updateAuth('apikey', 'key', 'X-API-Key');
pm.request.updateAuth('apikey', 'in', 'header');`
  },
  {
    name: 'Remove Authentication',
    description: 'Remove authentication from request',
    code: `// Remove authentication from request
pm.request.removeAuth();
console.log('Authentication removed');`
  },
  {
    name: 'Dynamic Request URL',
    description: 'Modify the request URL based on environment',
    code: `// Get base URL from environment
const baseUrl = pm.environment.get('baseUrl') || 'https://api.example.com';
const endpoint = '/users';

// Set the complete URL
pm.request.setUrl(\`\${baseUrl}\${endpoint}\`);

// Or modify just part of the URL
const currentUrl = pm.request.url;
const userId = pm.environment.get('userId') || '123';
pm.request.setUrl(currentUrl.replace('{id}', userId));`
  },
  {
    name: 'Dynamic Request Body',
    description: 'Modify request body with dynamic data',
    code: `// Create dynamic request body
const requestBody = {
  username: pm.environment.get('testUsername') || 'testuser',
  email: \`test\${Date.now()}@example.com\`,
  timestamp: new Date().toISOString(),
  sessionId: pm.globals.get('sessionId')
};

// Set the request body
pm.request.setBody(JSON.stringify(requestBody));

// Add Content-Type header for JSON
pm.request.headers.upsert({
  key: 'Content-Type',
  value: 'application/json'
});`
  },
  {
    name: 'Set Authentication Token',
    description: 'Set a bearer token for authentication',
    code: `// Set authentication token
const token = 'your-api-token';
pm.environment.set('authToken', token);

// You can also generate dynamic tokens
const timestamp = Date.now();
const apiKey = pm.environment.get('apiKey');
const signature = \`\${apiKey}-\${timestamp}\`;
pm.environment.set('signature', signature);`
  },
  {
    name: 'Generate Timestamp',
    description: 'Create a timestamp for the request',
    code: `// Generate current timestamp
const timestamp = Date.now();
pm.environment.set('currentTimestamp', timestamp);

// Generate formatted date
const date = new Date();
pm.environment.set('currentDate', date.toISOString());
pm.environment.set('currentYear', date.getFullYear().toString());`
  },
  {
    name: 'Generate Random Data',
    description: 'Create random values for testing',
    code: `// Generate random values
const randomId = Math.floor(Math.random() * 10000);
const randomEmail = \`test\${randomId}@example.com\`;
const randomUsername = \`user_\${Date.now()}\`;

pm.environment.set('randomId', randomId);
pm.environment.set('randomEmail', randomEmail);
pm.environment.set('randomUsername', randomUsername);

// Generate UUID
const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});
pm.environment.set('uuid', uuid);`
  },
  {
    name: 'Log Request Details',
    description: 'Debug request information',
    code: `// Log request details
console.log('Request URL:', pm.request.url);
console.log('Request Method:', pm.request.method);
console.log('Request Headers:', pm.request.headers);

// Log environment variables
console.log('Environment:', pm.environment.name);
console.log('Auth Token:', pm.environment.get('authToken'));

// Alert important information
alert('Sending request to: ' + pm.request.url);`
  }
];

const testExamples: ScriptExample[] = [
  {
    name: 'Test Status Code',
    description: 'Verify response status codes',
    code: `// Test for successful response
pm.test('Status code is 200', () => {
  pm.expect(pm.response).to.have.status(200);
});

// Test for multiple acceptable status codes
pm.test('Status code is successful', () => {
  pm.expect(pm.response.code).to.be.oneOf([200, 201, 202]);
});

// Test for error status
pm.test('Status code is not 404', () => {
  pm.expect(pm.response).to.not.have.status(404);
});`
  },
  {
    name: 'Test Response Body',
    description: 'Validate response body structure',
    code: `// Test response is JSON
pm.test('Response is JSON', () => {
  pm.expect(pm.response.headers['content-type']).to.include('application/json');
});

// Test response body properties
pm.test('Response has required fields', () => {
  const jsonData = pm.response.body;
  pm.expect(jsonData).to.have.property('id');
  pm.expect(jsonData).to.have.property('name');
  pm.expect(jsonData.status).to.equal('active');
});

// Test array response
pm.test('Response is an array with items', () => {
  pm.expect(pm.response.body).to.be.an('array');
  pm.expect(pm.response.body.length).to.be.above(0);
});`
  },
  {
    name: 'Test Response Time',
    description: 'Check API performance',
    code: `// Test response time
pm.test('Response time is less than 500ms', () => {
  pm.expect(pm.response.responseTime).to.be.below(500);
});

// Test response time with warning
pm.test('Response time is acceptable', () => {
  if (pm.response.responseTime > 1000) {
    console.warn('Response time is slow:', pm.response.responseTime + 'ms');
  }
  pm.expect(pm.response.responseTime).to.be.below(2000);
});`
  },
  {
    name: 'Test Headers',
    description: 'Validate response headers',
    code: `// Test specific headers
pm.test('Content-Type header is present', () => {
  pm.expect(pm.response.headers).to.have.property('content-type');
});

// Test CORS headers
pm.test('CORS headers are properly set', () => {
  pm.expect(pm.response.headers['access-control-allow-origin']).to.exist;
  pm.expect(pm.response.headers['access-control-allow-methods']).to.include('GET');
});

// Test custom headers
pm.test('API version header is correct', () => {
  pm.expect(pm.response.headers['x-api-version']).to.equal('v1');
});`
  },
  {
    name: 'Multiple Tests Example',
    description: 'Comprehensive test suite',
    code: `// Test 1: Status Code
pm.test('Status code is 200', () => {
  pm.expect(pm.response).to.have.status(200);
});

// Test 2: Response Time
pm.test('Response time is less than 1000ms', () => {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});

// Test 3: Response Structure
pm.test('Response has correct structure', () => {
  const jsonData = pm.response.body;
  pm.expect(jsonData).to.be.an('object');
  pm.expect(jsonData).to.have.property('data');
  pm.expect(jsonData.data).to.be.an('array');
});

// Test 4: Data Validation
pm.test('All items have required fields', () => {
  const items = pm.response.body.data;
  items.forEach((item) => {
    pm.expect(item).to.have.property('id');
    pm.expect(item).to.have.property('name');
    pm.expect(item.id).to.be.a('number');
    pm.expect(item.name).to.be.a('string');
  });
});

// Test 5: Save data for next request
pm.test('Save first item ID', () => {
  const firstItem = pm.response.body.data[0];
  pm.environment.set('lastItemId', firstItem.id);
  console.log('Saved item ID:', firstItem.id);
});`
  }
];

export function ScriptExamplesDropdown({ type, onSelect }: ScriptExamplesDropdownProps) {
  const examples = type === 'pre-request' ? preRequestExamples : testExamples;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Lightbulb className="h-4 w-4 mr-2" />
          Examples
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          {type === 'pre-request' ? 'Pre-request Script Examples' : 'Test Script Examples'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {examples.map((example, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => onSelect(example.code)}
            className="flex flex-col items-start py-3 cursor-pointer"
          >
            <div className="font-medium">{example.name}</div>
            <div className="text-sm text-muted-foreground">{example.description}</div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}