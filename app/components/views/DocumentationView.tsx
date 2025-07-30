import React from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '~/components/ui/resizable';
import { cn } from '~/utils/cn';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { 
  Search, 
  BookOpen, 
  Rocket, 
  Code2, 
  Variable, 
  Package, 
  Zap, 
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Copy,
  PlayCircle,
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useRequestStore } from '~/stores/requestStore';
import { KeyboardShortcuts } from '~/components/documentation/KeyboardShortcuts';
import { MiniResponseViewer } from '~/components/documentation/MiniResponseViewer';
import { RequestExecution } from '~/types/request';
import { CodeHighlighter, InlineCode } from '~/components/ui/syntax-highlighter';
import { useApiClientConfig } from '~/components/ConfigProvider';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  subsections?: DocSection[];
  examples?: CodeExample[];
}

interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: string;
  runnable?: boolean;
  request?: any;
}

const documentationSections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Rocket className="h-4 w-4" />,
    content: `# Getting Started

Welcome to the API Client! This modern, browser-based tool helps you test and document REST APIs without any installation.

## Quick Start

1. **Enter a URL**: Type or paste an API endpoint in the center pane
2. **Select Method**: Choose GET, POST, PUT, etc. from the dropdown
3. **Click Send**: Press the Send button or use Ctrl/Cmd + Enter
4. **View Response**: Check the response in the right pane

## Interface Overview

The API Client uses a three-pane layout:
- **Left**: Collection Explorer - organize your API requests
- **Center**: Request Builder - configure and send requests
- **Right**: Response Viewer - see results and test outcomes

All panes are resizable - drag the dividers to customize your workspace!`,
    examples: [
      {
        title: 'Your First Request',
        description: 'Try this simple GET request to see the API Client in action',
        code: 'GET https://api.github.com/users/github',
        language: 'http',
        runnable: true,
        request: {
          method: 'GET',
          url: 'https://api.github.com/users/github',
          headers: [{ key: 'Accept', value: 'application/json' }]
        }
      }
    ]
  },
  {
    id: 'request-builder',
    title: 'Request Builder',
    icon: <Code2 className="h-4 w-4" />,
    content: `# Request Builder

The Request Builder is where you configure all aspects of your API requests.

## HTTP Methods

Each method serves a specific purpose:
- **GET**: Retrieve data
- **POST**: Create new resources
- **PUT**: Update entire resources
- **PATCH**: Partially update resources
- **DELETE**: Remove resources

## URL Construction

Build dynamic URLs with variables:
\`\`\`
{{base_url}}/api/v1/users/{{user_id}}
\`\`\`

## Headers

Add custom headers for authentication, content type, and more. Common headers include:
- \`Content-Type: application/json\`
- \`Authorization: Bearer {{token}}\`
- \`Accept: application/json\`

## Request Body

For POST, PUT, and PATCH requests, you can send:
- **JSON**: Most common format for APIs
- **Form Data**: For file uploads
- **URL Encoded**: Traditional form submissions
- **Raw**: Plain text or XML`,
    examples: [
      {
        title: 'POST Request with JSON',
        description: 'Create a new resource with JSON data',
        code: `POST https://jsonplaceholder.typicode.com/posts
Content-Type: application/json

{
  "title": "My New Post",
  "body": "This is the content",
  "userId": 1
}`,
        language: 'http',
        runnable: true,
        request: {
          method: 'POST',
          url: 'https://jsonplaceholder.typicode.com/posts',
          headers: [{ key: 'Content-Type', value: 'application/json' }],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              title: 'My New Post',
              body: 'This is the content',
              userId: 1
            }, null, 2)
          }
        }
      }
    ]
  },
  {
    id: 'variables',
    title: 'Variables & Environments',
    icon: <Variable className="h-4 w-4" />,
    content: `# Variables & Environments

Variables make your requests dynamic and reusable across different environments.

## Variable Types

1. **Global Variables**: Available everywhere
2. **Environment Variables**: Specific to selected environment
3. **Collection Variables**: Scoped to a collection
4. **Local Variables**: Set via scripts

## Using Variables

Use double curly braces to reference variables:
\`\`\`
{{variable_name}}
\`\`\`

## Environment Management

Create separate environments for:
- Development: \`http://localhost:3000\`
- Staging: \`https://staging.api.com\`
- Production: \`https://api.production.com\`

Switch environments with a single click to test across different setups!`,
    subsections: [
      {
        id: 'variable-scope',
        title: 'Variable Scope',
        icon: <></>,
        content: `## Variable Resolution Order

Variables are resolved in this order (first wins):
1. Local variables (set in scripts)
2. Environment variables
3. Collection variables
4. Global variables

This allows you to override broader variables with more specific ones.`
      }
    ]
  },
  {
    id: 'collections',
    title: 'Collections',
    icon: <Package className="h-4 w-4" />,
    content: `# Collections

Organize your API requests into collections for better management.

## Creating Collections

1. Click the "+" button in the collection explorer
2. Name your collection
3. Add folders to group related requests
4. Save requests for reuse

## Collection Features

- **Folders**: Organize requests hierarchically
- **Variables**: Set collection-level variables
- **Authorization**: Inherit auth across requests
- **Documentation**: Add descriptions to requests

## Importing & Exporting

The API Client supports:
- **Postman Collections v2.1**: Full compatibility
- **Export**: Share collections with your team
- **Import**: Bring in existing collections`,
    examples: [
      {
        title: 'Collection Structure',
        description: 'Organize your APIs effectively',
        code: `📁 My API Collection
├── 📁 Authentication
│   ├── 📄 Login
│   ├── 📄 Refresh Token
│   └── 📄 Logout
├── 📁 Users
│   ├── 📄 Get All Users
│   ├── 📄 Get User by ID
│   ├── 📄 Create User
│   └── 📄 Update User
└── 📁 Products
    ├── 📄 List Products
    └── 📄 Search Products`,
        language: 'text',
        runnable: false
      }
    ]
  },
  {
    id: 'scripting',
    title: 'Scripting',
    icon: <Zap className="h-4 w-4" />,
    content: `# Scripting

Add dynamic behavior to your requests with JavaScript scripts.

## Pre-request Scripts

Run before the request is sent:
\`\`\`javascript
// Set a timestamp
pm.environment.set("timestamp", new Date().toISOString());

// Generate a random ID
pm.environment.set("random_id", Math.random().toString(36));
\`\`\`

## Test Scripts

Validate responses after they're received:
\`\`\`javascript
// Check status code
pm.test("Status is 200", () => {
    pm.expect(pm.response.code).to.equal(200);
});

// Validate response time
pm.test("Response time under 500ms", () => {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
\`\`\`

## PM API Reference

The PM object provides access to:
- \`pm.environment\`: Get/set environment variables
- \`pm.globals\`: Access global variables
- \`pm.request\`: Modify the current request (URL, method, headers, body, auth)
- \`pm.response\`: Access response data
- \`pm.test\`: Define test assertions`,
    examples: [
      {
        title: 'Dynamic Authentication',
        description: 'Automatically refresh tokens when needed',
        code: `// Pre-request script
const tokenExpiry = pm.environment.get("token_expiry");
const now = new Date().getTime();

if (!tokenExpiry || now > tokenExpiry) {
    // Token expired, refresh it
    pm.sendRequest({
        url: pm.environment.get("auth_url") + "/refresh",
        method: "POST",
        body: {
            refresh_token: pm.environment.get("refresh_token")
        }
    }, (err, res) => {
        if (!err && res.code === 200) {
            const data = res.json();
            pm.environment.set("access_token", data.access_token);
            pm.environment.set("token_expiry", data.expires_at);
        }
    });
}`,
        language: 'javascript',
        runnable: false
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: <HelpCircle className="h-4 w-4" />,
    content: `# Troubleshooting

## Common Issues

### CORS Errors

If you see "Access-Control-Allow-Origin" errors:
1. Use the included proxy server
2. Check if the API supports CORS
3. Contact the API provider

### Request Timeouts

For slow APIs:
- Increase timeout in settings
- Check your internet connection
- Verify the API endpoint is correct

### Variables Not Resolving

If you see \`{{variable}}\` instead of values:
- Check variable is defined
- Verify environment is selected
- Look for typos in variable names

## Performance Tips

- Use pagination for large responses
- Clear old request history periodically
- Close unused tabs
- Limit response preview for large payloads

## Getting Help

- Check the FAQ section below
- Report issues on GitHub
- Contact support@api-client.dev`
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: <HelpCircle className="h-4 w-4" />,
    content: `# Frequently Asked Questions

## General Questions

**Q: Is the API Client free to use?**
A: Yes, the core features are completely free. Premium features may be added in the future.

**Q: Can I use it offline?**
A: The app works offline, but you need internet to make API requests to external servers.

**Q: Is my data secure?**
A: All data is stored locally in your browser. Nothing is sent to our servers.

**Q: Can I import from Postman?**
A: Yes! Export your Postman collection as v2.1 format and import it directly.

## Technical Questions

**Q: What's the maximum response size?**
A: Browser-dependent, typically 50-100MB. Large responses may slow the UI.

**Q: Can I test WebSocket APIs?**
A: WebSocket support is planned for a future release.

**Q: Does it support GraphQL?**
A: Basic GraphQL queries work with POST requests. Full support coming soon.

**Q: Can I run it locally?**
A: Yes, you can self-host the application. Check our GitHub repository.

## Feature Questions

**Q: Can multiple people share collections?**
A: Currently local-only. Team sync features are planned.

**Q: Is there a CLI version?**
A: No, but you can export to cURL for command-line use.

**Q: Can I generate API documentation?**
A: Documentation generation is planned for a future release.

**Q: Does it support OAuth 2.0?**
A: Manual OAuth is supported. Automated flow coming soon.

## Need More Help?

Can't find your answer? Check our GitHub issues or contact support!`
  }
];

export function DocumentationView() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSection, setSelectedSection] = React.useState('getting-started');
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['getting-started', 'request-builder', 'variables', 'collections', 'scripting'])
  );
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const [exampleResponses, setExampleResponses] = React.useState<Map<string, RequestExecution>>(new Map());
  const [loadingExamples, setLoadingExamples] = React.useState<Set<string>>(new Set());
  
  const { executeRequest, getResponseForRequest } = useRequestStore();
  const config = useApiClientConfig();
  
  // Set up keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };
  
  const findSectionById = (id: string): DocSection | undefined => {
    for (const section of documentationSections) {
      if (section.id === id) return section;
      if (section.subsections) {
        const subsection = section.subsections.find(sub => sub.id === id);
        if (subsection) return subsection;
      }
    }
    return undefined;
  };
  
  const currentSection = findSectionById(selectedSection) || documentationSections[0];
  
  const handleRunExample = async (example: CodeExample, exampleIndex: number) => {
    if (!example.runnable || !example.request) return;
    
    const exampleId = `${currentSection.id}-example-${exampleIndex}`;
    
    // Set loading state
    setLoadingExamples(prev => new Set([...prev, exampleId]));
    
    try {
      // Execute the example request
      await executeRequest(example.request, exampleId, {});
      
      // Get the response from the store
      const response = getResponseForRequest(exampleId);
      if (response) {
        setExampleResponses(prev => new Map([...prev, [exampleId, response]]));
      }
    } catch (error) {
      console.error('Failed to execute example:', error);
    } finally {
      // Clear loading state
      setLoadingExamples(prev => {
        const newSet = new Set(prev);
        newSet.delete(exampleId);
        return newSet;
      });
    }
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Show toast notification
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  // Filter sections based on search
  const filteredSections = React.useMemo(() => {
    if (!searchQuery) return documentationSections;
    
    const query = searchQuery.toLowerCase();
    return documentationSections.filter(section => {
      const matchesTitle = section.title.toLowerCase().includes(query);
      const matchesContent = section.content.toLowerCase().includes(query);
      const matchesSubsections = section.subsections?.some(sub => 
        sub.title.toLowerCase().includes(query) || 
        sub.content.toLowerCase().includes(query)
      );
      return matchesTitle || matchesContent || matchesSubsections;
    });
  }, [searchQuery]);
  
  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full"
      >
      {/* Left Panel - Navigation */}
      <ResizablePanel 
        defaultSize={25} 
        minSize={20}
        maxSize={35}
        className="bg-sidebar"
      >
        <div className="h-full flex flex-col">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {filteredSections.map(section => (
                <div key={section.id}>
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      selectedSection === section.id 
                        ? "bg-accent text-accent-foreground" 
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    {section.icon}
                    <span className="flex-1 text-left">{section.title}</span>
                    {section.subsections && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSection(section.id);
                        }}
                        className="p-1"
                      >
                        {expandedSections.has(section.id) ? 
                          <ChevronDown className="h-3 w-3" /> : 
                          <ChevronRight className="h-3 w-3" />
                        }
                      </button>
                    )}
                  </button>
                  
                  {/* Subsections */}
                  {section.subsections && expandedSections.has(section.id) && (
                    <div className="ml-6 mt-1 space-y-1">
                      {section.subsections.map(subsection => (
                        <button
                          key={subsection.id}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                            selectedSection === subsection.id 
                              ? "bg-accent text-accent-foreground" 
                              : "hover:bg-accent/50"
                          )}
                          onClick={() => setSelectedSection(subsection.id)}
                        >
                          <span className="text-left">{subsection.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="p-4 border-t space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => window.open(config.repository.url, '_blank')}
            >
              {config.repository.icon || <ExternalLink className="h-4 w-4 mr-2" />}
              {config.repository.label}
            </Button>
            <div 
              className="text-xs text-muted-foreground text-center cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setShowShortcuts(true)}
            >
              Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">?</kbd> for keyboard shortcuts
            </div>
          </div>
        </div>
      </ResizablePanel>
      
      <ResizableHandle withHandle />
      
      {/* Right Panel - Content */}
      <ResizablePanel defaultSize={75}>
        <div className="h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <BookOpen className="h-4 w-4" />
              <span>Documentation</span>
              <ChevronRight className="h-4 w-4" />
              <span>{currentSection.title}</span>
            </div>
            
            {/* Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code: ({ inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : 'text';
                    
                    if (inline) {
                      return <InlineCode>{String(children)}</InlineCode>;
                    }
                    
                    return (
                      <CodeHighlighter
                        language={language}
                        showCopyButton={true}
                        theme="auto"
                      >
                        {String(children)}
                      </CodeHighlighter>
                    );
                  },
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mb-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold mt-8 mb-4">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mt-6 mb-3">{children}</h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 space-y-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 space-y-2">{children}</ol>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed">{children}</p>
                  ),
                }}
              >
                {currentSection.content}
              </ReactMarkdown>
            </div>
            
            {/* Examples */}
            {currentSection.examples && currentSection.examples.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-semibold mb-6">Examples</h2>
                <div className="space-y-6">
                  {currentSection.examples.map((example, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{example.title}</h3>
                          <p className="text-sm text-muted-foreground">{example.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {example.runnable && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleRunExample(example, index)}
                              disabled={loadingExamples.has(`${currentSection.id}-example-${index}`)}
                            >
                              <PlayCircle className="h-4 w-4 mr-2" />
                              {loadingExamples.has(`${currentSection.id}-example-${index}`) ? 'Running...' : 'Try It'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(example.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="relative">
                        <CodeHighlighter
                          language={example.language}
                          showCopyButton={true}
                          theme="auto"
                        >
                          {example.code}
                        </CodeHighlighter>
                      </div>
                      
                      {/* Response Display */}
                      {(() => {
                        const exampleId = `${currentSection.id}-example-${index}`;
                        const response = exampleResponses.get(exampleId);
                        const isLoading = loadingExamples.has(exampleId);
                        
                        if (isLoading || response) {
                          return (
                            <div className="px-4 pb-4">
                              <MiniResponseViewer 
                                response={response!} 
                                isLoading={isLoading}
                              />
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Help Section */}
            <div className="mt-16 p-6 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Need more help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Can't find what you're looking for? We're here to help!
              </p>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (config.support.email) {
                      window.location.href = `mailto:${config.support.email}`;
                    } else if (config.support.url) {
                      window.open(config.support.url, '_blank');
                    }
                  }}
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {config.support.label}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(config.community.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {config.community.label}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
    
      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcuts 
        open={showShortcuts} 
        onOpenChange={setShowShortcuts} 
      />
    </>
  );
}