import { Request as PostmanRequest } from '~/types/postman';

interface CodeGeneratorOptions {
  request: PostmanRequest;
  variables?: Record<string, string>;
}

function resolveUrl(url: string | { raw: string }, variables?: Record<string, string>): string {
  const rawUrl = typeof url === 'string' ? url : url.raw;
  if (!variables) return rawUrl;
  
  // Replace variables in URL
  return rawUrl.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] || match;
  });
}

function resolveHeaders(headers: Array<{ key: string; value: string }> | undefined, variables?: Record<string, string>): Array<{ key: string; value: string }> {
  if (!headers) return [];
  
  return headers.map(header => ({
    key: header.key,
    value: variables ? header.value.replace(/\{\{(\w+)\}\}/g, (match, varName) => variables[varName] || match) : header.value
  }));
}

export function generateCurl({ request, variables }: CodeGeneratorOptions): string {
  const url = resolveUrl(request.url, variables);
  const headers = resolveHeaders(request.header, variables);
  
  let curlCommand = `curl -X ${request.method} '${url}'`;
  
  // Add headers
  headers.forEach(header => {
    curlCommand += `\n  -H '${header.key}: ${header.value}'`;
  });
  
  // Add body if present
  if (request.body?.raw) {
    const body = variables 
      ? request.body.raw.replace(/\{\{(\w+)\}\}/g, (match, varName) => variables[varName] || match)
      : request.body.raw;
    
    curlCommand += `\n  -d '${body.replace(/'/g, "\\'")}'`;
  }
  
  return curlCommand;
}

export function generateJavaScript({ request, variables }: CodeGeneratorOptions): string {
  const url = resolveUrl(request.url, variables);
  const headers = resolveHeaders(request.header, variables);
  
  let code = `const response = await fetch('${url}', {\n`;
  code += `  method: '${request.method}',\n`;
  
  if (headers.length > 0) {
    code += `  headers: {\n`;
    headers.forEach((header, index) => {
      code += `    '${header.key}': '${header.value}'${index < headers.length - 1 ? ',' : ''}\n`;
    });
    code += `  },\n`;
  }
  
  if (request.body?.raw) {
    const body = variables 
      ? request.body.raw.replace(/\{\{(\w+)\}\}/g, (match, varName) => variables[varName] || match)
      : request.body.raw;
    
    code += `  body: ${JSON.stringify(body)}\n`;
  }
  
  code += `});\n\n`;
  code += `const data = await response.json();\n`;
  code += `console.log(data);`;
  
  return code;
}

export function generatePython({ request, variables }: CodeGeneratorOptions): string {
  const url = resolveUrl(request.url, variables);
  const headers = resolveHeaders(request.header, variables);
  
  let code = `import requests\n\n`;
  code += `url = "${url}"\n\n`;
  
  if (headers.length > 0) {
    code += `headers = {\n`;
    headers.forEach((header, index) => {
      code += `    "${header.key}": "${header.value}"${index < headers.length - 1 ? ',' : ''}\n`;
    });
    code += `}\n\n`;
  }
  
  if (request.body?.raw) {
    const body = variables 
      ? request.body.raw.replace(/\{\{(\w+)\}\}/g, (match, varName) => variables[varName] || match)
      : request.body.raw;
    
    code += `data = ${JSON.stringify(body)}\n\n`;
  }
  
  const method = request.method.toLowerCase();
  code += `response = requests.${method}(url`;
  
  if (headers.length > 0) {
    code += `, headers=headers`;
  }
  
  if (request.body?.raw) {
    code += `, data=data`;
  }
  
  code += `)\n\n`;
  code += `print(response.json())`;
  
  return code;
}

export function generateCSharp({ request, variables }: CodeGeneratorOptions): string {
  const url = resolveUrl(request.url, variables);
  const headers = resolveHeaders(request.header, variables);
  
  let code = `using System;\n`;
  code += `using System.Net.Http;\n`;
  code += `using System.Text;\n`;
  code += `using System.Threading.Tasks;\n\n`;
  code += `class Program\n{\n`;
  code += `    static async Task Main()\n    {\n`;
  code += `        using var client = new HttpClient();\n`;
  
  // Add headers
  headers.forEach(header => {
    code += `        client.DefaultRequestHeaders.Add("${header.key}", "${header.value}");\n`;
  });
  
  if (code.includes('DefaultRequestHeaders')) {
    code += `\n`;
  }
  
  // Handle different HTTP methods
  const method = request.method.toUpperCase();
  
  if (request.body?.raw) {
    const body = variables 
      ? request.body.raw.replace(/\{\{(\w+)\}\}/g, (match, varName) => variables[varName] || match)
      : request.body.raw;
    
    code += `        var content = new StringContent(${JSON.stringify(body)}, Encoding.UTF8, "application/json");\n`;
    code += `        var response = await client.${method[0] + method.slice(1).toLowerCase()}Async("${url}", content);\n`;
  } else {
    code += `        var response = await client.${method[0] + method.slice(1).toLowerCase()}Async("${url}");\n`;
  }
  
  code += `        var responseBody = await response.Content.ReadAsStringAsync();\n`;
  code += `        Console.WriteLine(responseBody);\n`;
  code += `    }\n`;
  code += `}`;
  
  return code;
}

export function generateSwift({ request, variables }: CodeGeneratorOptions): string {
  const url = resolveUrl(request.url, variables);
  const headers = resolveHeaders(request.header, variables);
  
  let code = `import Foundation\n\n`;
  code += `let url = URL(string: "${url}")!\n`;
  code += `var request = URLRequest(url: url)\n`;
  code += `request.httpMethod = "${request.method}"\n\n`;
  
  // Add headers
  headers.forEach(header => {
    code += `request.addValue("${header.value}", forHTTPHeaderField: "${header.key}")\n`;
  });
  
  if (headers.length > 0) {
    code += `\n`;
  }
  
  // Add body if present
  if (request.body?.raw) {
    const body = variables 
      ? request.body.raw.replace(/\{\{(\w+)\}\}/g, (match, varName) => variables[varName] || match)
      : request.body.raw;
    
    code += `let body = ${JSON.stringify(body)}\n`;
    code += `request.httpBody = body.data(using: .utf8)\n\n`;
  }
  
  code += `let task = URLSession.shared.dataTask(with: request) { data, response, error in\n`;
  code += `    guard let data = data else {\n`;
  code += `        print("Error: \\(error?.localizedDescription ?? "Unknown error")")\n`;
  code += `        return\n`;
  code += `    }\n`;
  code += `    \n`;
  code += `    if let responseString = String(data: data, encoding: .utf8) {\n`;
  code += `        print(responseString)\n`;
  code += `    }\n`;
  code += `}\n\n`;
  code += `task.resume()`;
  
  return code;
}

export function generatePowerShell({ request, variables }: CodeGeneratorOptions): string {
  const url = resolveUrl(request.url, variables);
  const headers = resolveHeaders(request.header, variables);
  
  let code = `$url = "${url}"\n`;
  
  if (headers.length > 0) {
    code += `$headers = @{\n`;
    headers.forEach((header, index) => {
      code += `    "${header.key}" = "${header.value}"${index < headers.length - 1 ? ';' : ''}\n`;
    });
    code += `}\n\n`;
  }
  
  if (request.body?.raw) {
    const body = variables 
      ? request.body.raw.replace(/\{\{(\w+)\}\}/g, (match, varName) => variables[varName] || match)
      : request.body.raw;
    
    code += `$body = @'\n${body}\n'@\n\n`;
  }
  
  code += `$response = Invoke-RestMethod -Uri $url -Method ${request.method}`;
  
  if (headers.length > 0) {
    code += ` -Headers $headers`;
  }
  
  if (request.body?.raw) {
    code += ` -Body $body -ContentType "application/json"`;
  }
  
  code += `\n\n`;
  code += `$response | ConvertTo-Json -Depth 10`;
  
  return code;
}

export function generateHttp({ request, variables }: CodeGeneratorOptions): string {
  const url = resolveUrl(request.url, variables);
  const headers = resolveHeaders(request.header, variables);
  
  // Parse URL to extract host, path, and query parameters
  let host = '';
  let path = '/';
  let query = '';
  
  try {
    const urlObj = new URL(url);
    host = urlObj.host;
    path = urlObj.pathname || '/';
    if (urlObj.search) {
      query = urlObj.search;
    }
  } catch {
    // If URL parsing fails, treat the entire URL as path
    host = 'localhost';
    path = url;
  }
  
  // Build the HTTP request
  let httpRequest = `${request.method} ${path}${query} HTTP/1.1\n`;
  
  // Add Host header (required for HTTP/1.1)
  httpRequest += `Host: ${host}\n`;
  
  // Add other headers
  headers.forEach(header => {
    httpRequest += `${header.key}: ${header.value}\n`;
  });
  
  // Add body if present
  if (request.body?.raw) {
    const body = variables 
      ? request.body.raw.replace(/\{\{(\w+)\}\}/g, (match, varName) => variables[varName] || match)
      : request.body.raw;
    
    // Add Content-Length header if not already present
    const hasContentLength = headers.some(h => h.key.toLowerCase() === 'content-length');
    if (!hasContentLength) {
      const contentLength = new TextEncoder().encode(body).length;
      httpRequest += `Content-Length: ${contentLength}\n`;
    }
    
    httpRequest += `\n${body}`;
  } else {
    // Empty line to end headers section
    httpRequest += '\n';
  }
  
  return httpRequest;
}

export const codeGenerators = {
  http: generateHttp,
  curl: generateCurl,
  javascript: generateJavaScript,
  python: generatePython,
  csharp: generateCSharp,
  swift: generateSwift,
  powershell: generatePowerShell
};