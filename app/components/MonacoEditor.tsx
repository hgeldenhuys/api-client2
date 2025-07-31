import React, { useRef, useEffect } from 'react';
import Editor, { OnChange, OnMount, BeforeMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useEnvironmentStore } from '~/stores/environmentStore';

interface MonacoEditorProps {
  value: string;
  onChange?: OnChange;
  language?: string;
  height?: string | number;
  theme?: 'vs-dark' | 'vs' | 'hc-black';
  readOnly?: boolean;
  minimap?: boolean;
  placeholder?: string;
}

// Track whether providers have been registered to avoid duplicates
let apiScriptProvidersRegistered = false;
let jsonProvidersRegistered = false;

export function MonacoEditor({
  value,
  onChange,
  language = 'javascript',
  height = '100%',
  theme = 'vs-dark',
  readOnly = false,
  minimap = false,
  placeholder
}: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { resolveAllVariables } = useEnvironmentStore();
  
  const handleBeforeMount: BeforeMount = (monaco) => {
    // Define custom themes before editor mounts
    monaco.editor.defineTheme('api-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        // Custom token colors
        { token: 'variable.template', foreground: '4EC9B0' }, // Teal color for variables
        { token: 'delimiter.curly', foreground: '4EC9B0' } // Also color the braces
      ],
      colors: {}
    });
    
    monaco.editor.defineTheme('api-light', {
      base: 'vs',
      inherit: true,
      rules: [
        // Custom token colors
        { token: 'variable.template', foreground: '0066CC' }, // Blue color for variables
        { token: 'delimiter.curly', foreground: '0066CC' } // Also color the braces
      ],
      colors: {}
    });
    
    // Register custom language that extends JavaScript
    monaco.languages.register({ id: 'api-script' });
    
    // Configure language settings
    monaco.languages.setLanguageConfiguration('api-script', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' },
        { open: '{{', close: '}}' }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' },
        { open: '{{', close: '}}' }
      ],
      onEnterRules: [
        {
          beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
          afterText: /^\s*\*\/$/,
          action: {
            indentAction: monaco.languages.IndentAction.IndentOutdent,
            appendText: ' * '
          }
        }
      ]
    });
    
    // Define tokenizer for our custom language
    monaco.languages.setMonarchTokensProvider('api-script', {
      defaultToken: '',
      tokenPostfix: '.js',
      
      keywords: [
        'break', 'case', 'catch', 'class', 'continue', 'const',
        'constructor', 'debugger', 'default', 'delete', 'do', 'else',
        'export', 'extends', 'false', 'finally', 'for', 'from', 'function',
        'get', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null',
        'return', 'set', 'super', 'switch', 'symbol', 'this', 'throw', 'true',
        'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield',
        'async', 'await', 'of'
      ],
      
      typeKeywords: [
        'any', 'boolean', 'number', 'object', 'string', 'undefined'
      ],
      
      operators: [
        '<=', '>=', '==', '!=', '===', '!==', '=>', '+', '-', '**',
        '*', '/', '%', '++', '--', '<<', '</,', '>>', '>>>', '&',
        '|', '^', '!', '~', '&&', '||', '??', '?', ':', '=', '+=', '-=',
        '*=', '**=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '@',
      ],
      
      symbols:  /[=><!~?:&|+\-*\/\^%]+/,
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
      digits: /\d+(_+\d+)*/,
      octaldigits: /[0-7]+(_+[0-7]+)*/,
      binarydigits: /[0-1]+(_+[0-1]+)*/,
      hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
      
      regexpctl: /[(){}\[\]\$\^|\-*+?\.]/,
      regexpesc: /\\(?:[bBdDfnrstvwWn0\\\/]|@regexpctl|c[A-Z]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/,
      
      tokenizer: {
        root: [
          [/[{}]/, 'delimiter.bracket'],
          { include: 'common' }
        ],
        
        common: [
          // Variable pattern - match {{variable}} 
          [/\{\{/, { token: 'delimiter.curly', next: '@variable' }],
          
          // identifiers and keywords
          [/[a-z_$][\w$]*/, {
            cases: {
              '@typeKeywords': 'keyword',
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          [/[A-Z][\w\$]*/, 'type.identifier'],  // to show class names nicely
          
          // whitespace
          { include: '@whitespace' },
          
          // regular expression: ensure it is terminated before beginning
          [/\/(?=([^\\\/]|\\.)+\/([dgimsuy]*)(\s*)(\.|;|,|\)|\]|\}|$))/, { token: 'regexp', next: '@regexp' }],
          
          // delimiters and operators
          [/[()[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'delimiter',
              '@default': ''
            }
          }],
          
          // numbers
          [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
          [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
          [/0[xX](@hexdigits)n?/, 'number.hex'],
          [/0[oO]?(@octaldigits)n?/, 'number.octal'],
          [/0[bB](@binarydigits)n?/, 'number.binary'],
          [/(@digits)n?/, 'number'],
          
          // delimiter: after number because of .\d floats
          [/[;,.]/, 'delimiter'],
          
          // strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
          [/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
          [/`/, 'string', '@string_backtick'],
        ],
        
        variable: [
          [/[^}]+/, 'variable.template'],
          [/\}\}/, { token: 'delimiter.curly', next: '@pop' }],
          [/}/, 'variable.template']
        ],
        
        whitespace: [
          [/[ \t\r\n]+/, ''],
          [/\/\*\*(?!\/)/, 'comment.doc', '@jsdoc'],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment'],
        ],
        
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],
        
        jsdoc: [
          [/[^\/*]+/, 'comment.doc'],
          [/\*\//, 'comment.doc', '@pop'],
          [/[\/*]/, 'comment.doc']
        ],
        
        regexp: [
          [/(\{)(\d+(?:,\d*)?)(\})/, ['regexp.escape.control', 'regexp.escape.control', 'regexp.escape.control']],
          [/(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/, ['regexp.escape.control', { token: 'regexp.escape.control', next: '@regexrange' }]],
          [/(\()(\?:|\?=|\?!)/, ['regexp.escape.control', 'regexp.escape.control']],
          [/[()]/, 'regexp.escape.control'],
          [/@regexpctl/, 'regexp.escape.control'],
          [/[^\\\/]/, 'regexp'],
          [/@regexpesc/, 'regexp.escape'],
          [/\\\./, 'regexp.invalid'],
          [/(\/)([dgimsuy]*)/, [{ token: 'regexp', next: '@pop' }, 'keyword.other']],
        ],
        
        regexrange: [
          [/-/, 'regexp.escape.control'],
          [/\^/, 'regexp.invalid'],
          [/@regexpesc/, 'regexp.escape'],
          [/[^\]]/, 'regexp'],
          [/\]/, { token: 'regexp.escape.control', next: '@pop' }]
        ],
        
        string_double: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, 'string', '@pop']
        ],
        
        string_single: [
          [/[^\\']+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/'/, 'string', '@pop']
        ],
        
        string_backtick: [
          [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
          [/[^\\`$]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/`/, 'string', '@pop']
        ],
        
        bracketCounting: [
          [/\{/, 'delimiter.bracket', '@bracketCounting'],
          [/\}/, 'delimiter.bracket', '@pop'],
          { include: 'common' }
        ],
      },
    });
    
    // Configure TypeScript compiler options for our custom language
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      allowJs: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noLib: true,
      typeRoots: []
    });
    
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false
    });
    
    // PM object type definitions for IntelliSense
    const pmLibSource = `
declare namespace pm {
  interface HeaderItem {
    key: string;
    value: string;
    disabled?: boolean;
  }
  
  interface HeaderList {
    add(header: HeaderItem | { key: string; value: string }): void;
    upsert(header: HeaderItem | { key: string; value: string }): void;
    remove(key: string): void;
    has(key: string): boolean;
    get(key: string): string | undefined;
    each(callback: (header: HeaderItem) => void): void;
    toObject(): { [key: string]: string };
    count(): number;
  }
  
  interface Request {
    url: string;
    method: string;
    headers: HeaderList;
    body?: any;
  }
  
  interface Response {
    code: number;
    status: string;
    headers: { [key: string]: string };
    body: any;
    json(): any;
    text(): string;
    responseTime: number;
  }
  
  interface EnvironmentVariable {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    unset(key: string): void;
    has(key: string): boolean;
    replaceIn(template: string): string;
  }
  
  interface Test {
    (name: string, fn: () => void): void;
  }
  
  interface Expect {
    (actual: any): ChaiExpect;
  }
  
  interface ChaiExpect {
    to: ChaiTo;
    not: ChaiExpect;
  }
  
  interface ChaiTo {
    equal(expected: any): void;
    eql(expected: any): void;
    be: ChaiBe;
    have: ChaiHave;
    include(value: any): void;
    match(pattern: RegExp): void;
  }
  
  interface ChaiBe {
    a(type: string): void;
    an(type: string): void;
    ok: void;
    true: void;
    false: void;
    null: void;
    undefined: void;
    above(n: number): void;
    below(n: number): void;
    empty: void;
  }
  
  interface ChaiHave {
    property(name: string, value?: any): void;
    length(n: number): void;
    status(code: number): void;
    header(name: string, value?: string): void;
    json(path?: string, value?: any): void;
  }
  
  const request: Request;
  const response: Response;
  const environment: EnvironmentVariable;
  const globals: EnvironmentVariable;
  const collectionVariables: EnvironmentVariable;
  const variables: EnvironmentVariable;
  const test: Test;
  const expect: Expect;
  
  function sendRequest(options: {
    url: string;
    method?: string;
    headers?: { [key: string]: string };
    body?: any;
  }, callback: (err: any, response: Response) => void): void;
}

declare const pm: typeof pm;
declare const console: Console;
`;
    
    // Add type definitions to JavaScript
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      pmLibSource,
      'pm.d.ts'
    );
  };
  
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Only register completion providers for api-script language
    if (language === 'api-script' && !apiScriptProvidersRegistered) {
      apiScriptProvidersRegistered = true;
      // Register completion provider for variables and PM API
      monaco.languages.registerCompletionItemProvider('api-script', {
        triggerCharacters: ['{', '.', "'", '"'],
        provideCompletionItems: (model, position, context) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          });
          
          const suggestions: monaco.languages.CompletionItem[] = [];
          
          // Check if we're inside PM API variable methods
          const pmMethodPatterns = [
            /pm\.(environment|globals|collectionVariables|variables)\.(get|set|has|unset)\s*\(\s*["']$/,
            /pm\.(environment|globals|collectionVariables|variables)\.(get|set|has|unset)\s*\(\s*["'][^"']*$/
          ];
          
          const matchesPmMethod = pmMethodPatterns.some(pattern => pattern.test(textUntilPosition));
          
          if (matchesPmMethod) {
            // Extract what's already typed inside the quotes
            const quoteMatch = textUntilPosition.match(/["']([^"']*)$/);
            const typedText = quoteMatch ? quoteMatch[1] : '';
            
            // Calculate range for replacement
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column - typedText.length,
              endColumn: position.column
            };
            
            const variables = resolveAllVariables();
            const varSuggestions = Object.entries(variables)
              .filter(([key]) => key.toLowerCase().includes(typedText.toLowerCase()))
              .map(([key, value]) => ({
                label: key,
                kind: monaco.languages.CompletionItemKind.Variable,
                detail: 'Variable',
                documentation: `Current value: ${value}`,
                insertText: key,
                range: range
              }));
            
            suggestions.push(...varSuggestions);
          }
          
          // Check if we're in a string literal and user typed {{
          const inString = (() => {
            let inSingle = false;
            let inDouble = false;
            let inTemplate = false;
            let escaped = false;
            
            for (let i = 0; i < textUntilPosition.length - 1; i++) {
              const char = textUntilPosition[i];
              if (escaped) {
                escaped = false;
                continue;
              }
              if (char === '\\') {
                escaped = true;
                continue;
              }
              if (char === "'" && !inDouble && !inTemplate) inSingle = !inSingle;
              if (char === '"' && !inSingle && !inTemplate) inDouble = !inDouble;
              if (char === '`' && !inSingle && !inDouble) inTemplate = !inTemplate;
            }
            
            return inSingle || inDouble || inTemplate;
          })();
          
          // Only show {{variable}} completions inside strings
          const beforeCursor = textUntilPosition.slice(-2);
          if (inString && (beforeCursor === '{{' || (textUntilPosition.endsWith('{') && context.triggerCharacter === '{'))) {
            // Variable completions for string interpolation
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: beforeCursor === '{{' ? position.column - 2 : position.column - 1,
              endColumn: word.endColumn
            };
            
            const variables = resolveAllVariables();
            const varSuggestions = Object.entries(variables).map(([key, value]) => ({
              label: key,
              kind: monaco.languages.CompletionItemKind.Variable,
              detail: 'Environment Variable',
              documentation: `Current value: ${value}`,
              insertText: beforeCursor === '{{' ? `${key}}}` : `{${key}}}`,
              range: range
            }));
            
            suggestions.push(...varSuggestions);
          }
          
          // Check if we're typing pm. for PM API suggestions
          const lineText = model.getLineContent(position.lineNumber);
          const beforePosition = lineText.substring(0, position.column - 1);
          
          if (beforePosition.endsWith('pm.')) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column
            };
            
            // PM API suggestions
            const pmMethods = [
              { label: 'environment', detail: 'Environment variables', documentation: 'Access environment variables' },
              { label: 'globals', detail: 'Global variables', documentation: 'Access global variables' },
              { label: 'collectionVariables', detail: 'Collection variables', documentation: 'Access collection variables' },
              { label: 'variables', detail: 'All variables', documentation: 'Access all variables' },
              { label: 'request', detail: 'Current request', documentation: 'Access current request details' },
              { label: 'response', detail: 'Current response', documentation: 'Access current response details' },
              { label: 'test', detail: 'Write tests', documentation: 'Write test assertions' },
              { label: 'expect', detail: 'Chai assertions', documentation: 'Create test expectations' },
              { label: 'sendRequest', detail: 'Send HTTP request', documentation: 'Send an HTTP request' }
            ];
            
            const pmSuggestions = pmMethods.map(method => ({
              label: method.label,
              kind: monaco.languages.CompletionItemKind.Property,
              detail: method.detail,
              documentation: method.documentation,
              insertText: method.label,
              range: range
            }));
            
            suggestions.push(...pmSuggestions);
          }
          
          if (beforePosition.endsWith('pm.environment.') || 
              beforePosition.endsWith('pm.globals.') || 
              beforePosition.endsWith('pm.collectionVariables.') ||
              beforePosition.endsWith('pm.variables.')) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column
            };
            
            const varMethods = [
              { label: 'get', detail: '(key: string)', documentation: 'Get a variable value' },
              { label: 'set', detail: '(key: string, value: string)', documentation: 'Set a variable value' },
              { label: 'unset', detail: '(key: string)', documentation: 'Remove a variable' },
              { label: 'has', detail: '(key: string)', documentation: 'Check if variable exists' },
              { label: 'replaceIn', detail: '(template: string)', documentation: 'Replace variables in template' }
            ];
            
            const methodSuggestions = varMethods.map(method => ({
              label: method.label,
              kind: monaco.languages.CompletionItemKind.Method,
              detail: method.detail,
              documentation: method.documentation,
              insertText: method.label,
              range: range
            }));
            
            suggestions.push(...methodSuggestions);
          }
          
          // PM Request properties
          if (beforePosition.endsWith('pm.request.')) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column
            };
            
            const requestProperties = [
              { label: 'url', kind: monaco.languages.CompletionItemKind.Property, detail: 'string', documentation: 'The request URL' },
              { label: 'method', kind: monaco.languages.CompletionItemKind.Property, detail: 'string', documentation: 'HTTP method (GET, POST, PUT, etc.)' },
              { label: 'headers', kind: monaco.languages.CompletionItemKind.Property, detail: 'HeaderList', documentation: 'Request headers collection with methods: add, upsert, remove, get, has' },
              { label: 'body', kind: monaco.languages.CompletionItemKind.Property, detail: 'any', documentation: 'Request body content' },
              { label: 'auth', kind: monaco.languages.CompletionItemKind.Property, detail: 'object', documentation: 'Authentication details' }
            ];
            
            const requestSuggestions = requestProperties.map(prop => ({
              ...prop,
              insertText: prop.label,
              range: range
            }));
            
            suggestions.push(...requestSuggestions);
          }
          
          // PM Request.headers methods
          if (beforePosition.endsWith('pm.request.headers.')) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column
            };
            
            const headerMethods = [
              { label: 'add', kind: monaco.languages.CompletionItemKind.Method, detail: '(header: {key: string, value: string})', documentation: 'Add a new header' },
              { label: 'upsert', kind: monaco.languages.CompletionItemKind.Method, detail: '(header: {key: string, value: string})', documentation: 'Update existing header or add if not exists' },
              { label: 'remove', kind: monaco.languages.CompletionItemKind.Method, detail: '(key: string)', documentation: 'Remove a header by key' },
              { label: 'get', kind: monaco.languages.CompletionItemKind.Method, detail: '(key: string)', documentation: 'Get header value by key' },
              { label: 'has', kind: monaco.languages.CompletionItemKind.Method, detail: '(key: string)', documentation: 'Check if header exists' },
              { label: 'each', kind: monaco.languages.CompletionItemKind.Method, detail: '(callback: Function)', documentation: 'Iterate over all headers' },
              { label: 'toObject', kind: monaco.languages.CompletionItemKind.Method, detail: '()', documentation: 'Convert headers to plain object' },
              { label: 'count', kind: monaco.languages.CompletionItemKind.Method, detail: '()', documentation: 'Get number of headers' }
            ];
            
            const headerSuggestions = headerMethods.map(method => ({
              ...method,
              insertText: method.label,
              range: range
            }));
            
            suggestions.push(...headerSuggestions);
          }
          
          // PM Response properties and methods
          if (beforePosition.endsWith('pm.response.')) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column
            };
            
            const responseProperties = [
              { label: 'code', kind: monaco.languages.CompletionItemKind.Property, detail: 'number', documentation: 'HTTP response status code (e.g., 200, 404)' },
              { label: 'status', kind: monaco.languages.CompletionItemKind.Property, detail: 'string', documentation: 'HTTP status text (e.g., "OK", "Not Found")' },
              { label: 'headers', kind: monaco.languages.CompletionItemKind.Property, detail: 'object', documentation: 'Response headers as key-value pairs' },
              { label: 'body', kind: monaco.languages.CompletionItemKind.Property, detail: 'any', documentation: 'Raw response body' },
              { label: 'responseTime', kind: monaco.languages.CompletionItemKind.Property, detail: 'number', documentation: 'Response time in milliseconds' },
              { label: 'json', kind: monaco.languages.CompletionItemKind.Method, detail: '() => any', documentation: 'Parse response body as JSON' },
              { label: 'text', kind: monaco.languages.CompletionItemKind.Method, detail: '() => string', documentation: 'Get response body as text' },
              { label: 'to', kind: monaco.languages.CompletionItemKind.Property, detail: 'ChaiAssertions', documentation: 'Chai assertion chain for testing' }
            ];
            
            const responseSuggestions = responseProperties.map(prop => ({
              ...prop,
              insertText: prop.label,
              range: range
            }));
            
            suggestions.push(...responseSuggestions);
          }
          
          // PM Response.to assertions
          if (beforePosition.endsWith('pm.response.to.')) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column
            };
            
            const toAssertions = [
              { label: 'have', kind: monaco.languages.CompletionItemKind.Property, detail: 'ChaiHave', documentation: 'Chain for have assertions' },
              { label: 'be', kind: monaco.languages.CompletionItemKind.Property, detail: 'ChaiBe', documentation: 'Chain for be assertions' },
              { label: 'not', kind: monaco.languages.CompletionItemKind.Property, detail: 'ChaiAssertions', documentation: 'Negate the assertion' }
            ];
            
            const toSuggestions = toAssertions.map(assertion => ({
              ...assertion,
              insertText: assertion.label,
              range: range
            }));
            
            suggestions.push(...toSuggestions);
          }
          
          // PM Response.to.have assertions
          if (beforePosition.endsWith('pm.response.to.have.')) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column
            };
            
            const haveAssertions = [
              { label: 'status', detail: '(code: number)', documentation: 'Assert response has specific status code' },
              { label: 'header', detail: '(name: string, value?: string)', documentation: 'Assert response has specific header' },
              { label: 'jsonBody', detail: '(path?: string, value?: any)', documentation: 'Assert JSON body contains value' },
              { label: 'body', detail: '(value: string | RegExp)', documentation: 'Assert response body contains text' },
              { label: 'property', detail: '(name: string, value?: any)', documentation: 'Assert object has property' }
            ];
            
            const haveSuggestions = haveAssertions.map(method => ({
              label: method.label,
              kind: monaco.languages.CompletionItemKind.Method,
              detail: method.detail,
              documentation: method.documentation,
              insertText: method.label,
              range: range
            }));
            
            suggestions.push(...haveSuggestions);
          }
          
          // PM Response.to.be assertions
          if (beforePosition.endsWith('pm.response.to.be.')) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column
            };
            
            const beAssertions = [
              { label: 'ok', kind: monaco.languages.CompletionItemKind.Property, detail: '', documentation: 'Assert response is successful (2xx status)' },
              { label: 'accepted', kind: monaco.languages.CompletionItemKind.Property, detail: '', documentation: 'Assert response status is 202' },
              { label: 'badRequest', kind: monaco.languages.CompletionItemKind.Property, detail: '', documentation: 'Assert response status is 400' },
              { label: 'notFound', kind: monaco.languages.CompletionItemKind.Property, detail: '', documentation: 'Assert response status is 404' },
              { label: 'json', kind: monaco.languages.CompletionItemKind.Property, detail: '', documentation: 'Assert response has JSON content-type' }
            ];
            
            const beSuggestions = beAssertions.map(assertion => ({
              ...assertion,
              insertText: assertion.label,
              range: range
            }));
            
            suggestions.push(...beSuggestions);
          }
          
          // Console method suggestions
          if (beforePosition.endsWith('console.')) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column
            };
            
            const consoleMethods = [
              { label: 'log', detail: '(...data: any[])', documentation: 'Outputs a message to the console' },
              { label: 'error', detail: '(...data: any[])', documentation: 'Outputs an error message to the console' },
              { label: 'warn', detail: '(...data: any[])', documentation: 'Outputs a warning message to the console' },
              { label: 'info', detail: '(...data: any[])', documentation: 'Outputs an informational message to the console' },
              { label: 'debug', detail: '(...data: any[])', documentation: 'Outputs a debug message to the console' },
              { label: 'table', detail: '(data: any, columns?: string[])', documentation: 'Displays tabular data as a table' },
              { label: 'time', detail: '(label?: string)', documentation: 'Starts a timer you can use to track how long an operation takes' },
              { label: 'timeEnd', detail: '(label?: string)', documentation: 'Stops a timer that was previously started by console.time()' },
              { label: 'timeLog', detail: '(label?: string, ...data: any[])', documentation: 'Logs the current value of a timer' },
              { label: 'trace', detail: '(...data: any[])', documentation: 'Outputs a stack trace to the console' },
              { label: 'assert', detail: '(condition?: boolean, ...data: any[])', documentation: 'Writes an error message if the assertion is false' },
              { label: 'clear', detail: '()', documentation: 'Clears the console' },
              { label: 'count', detail: '(label?: string)', documentation: 'Logs the number of times this line has been called' },
              { label: 'countReset', detail: '(label?: string)', documentation: 'Resets the counter' },
              { label: 'group', detail: '(...label: any[])', documentation: 'Creates a new inline group in the console' },
              { label: 'groupCollapsed', detail: '(...label: any[])', documentation: 'Creates a new inline group that starts collapsed' },
              { label: 'groupEnd', detail: '()', documentation: 'Exits the current inline group' },
              { label: 'dir', detail: '(item?: any, options?: any)', documentation: 'Displays an interactive list of object properties' },
              { label: 'dirxml', detail: '(...data: any[])', documentation: 'Displays an XML/HTML element representation' }
            ];
            
            const consoleSuggestions = consoleMethods.map(method => ({
              label: method.label,
              kind: monaco.languages.CompletionItemKind.Method,
              detail: method.detail,
              documentation: method.documentation,
              insertText: method.label,
              range: range
            }));
            
            suggestions.push(...consoleSuggestions);
          }
          
          return { suggestions };
        }
      });
    }
    
    // Also provide variable completions for JSON
    if (!jsonProvidersRegistered) {
      jsonProvidersRegistered = true;
      monaco.languages.registerCompletionItemProvider('json', {
      triggerCharacters: ['{'],
      provideCompletionItems: (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        
        // Check if we're after {{ or just {
        const beforeCursor = textUntilPosition.slice(-2);
        if (beforeCursor !== '{{' && !textUntilPosition.endsWith('{')) {
          return { suggestions: [] };
        }
        
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: beforeCursor === '{{' ? position.column - 2 : position.column - 1,
          endColumn: word.endColumn
        };
        
        const variables = resolveAllVariables();
        const suggestions = Object.entries(variables).map(([key, value]) => ({
          label: key,
          kind: monaco.languages.CompletionItemKind.Variable,
          detail: 'Environment Variable',
          documentation: `Current value: ${value}`,
          insertText: beforeCursor === '{{' ? `${key}}}"` : `{${key}}}"`,
          range: range
        }));
        
        return { suggestions };
      }
    });
    }
  };
  
  return (
    <Editor
      height={height}
      defaultLanguage={language}
      value={value}
      onChange={onChange}
      beforeMount={handleBeforeMount}
      onMount={handleEditorDidMount}
      theme={theme === 'vs-dark' ? 'api-dark' : 'api-light'}
      options={{
        readOnly,
        minimap: { enabled: minimap },
        fontSize: 13,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        automaticLayout: true,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10
        },
        placeholder,
        quickSuggestions: {
          other: true,
          comments: true,
          strings: true
        },
        suggestOnTriggerCharacters: true
      }}
    />
  );
}