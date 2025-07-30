import React, { useRef, useEffect } from 'react';
import Editor, { OnChange, OnMount } from '@monaco-editor/react';
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
  
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Register custom language for variable support
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'api-javascript')) {
      monaco.languages.register({ id: 'api-javascript' });
      
      // Configure tokenizer for {{variables}}
      monaco.languages.setMonarchTokensProvider('api-javascript', {
        tokenizer: {
          root: [
            // Variable pattern
            [/\{\{[\w.]+\}\}/, 'variable'],
            // JavaScript patterns
            [/[a-z_$][\w$]*/, {
              cases: {
                '@keywords': 'keyword',
                '@default': 'identifier'
              }
            }],
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
            [/\d+/, 'number'],
            [/\/\/.*$/, 'comment'],
            [/\/\*/, 'comment', '@comment'],
          ],
          string_double: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop']
          ],
          string_single: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape'],
            [/'/, 'string', '@pop']
          ],
          comment: [
            [/[^/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[/*]/, 'comment']
          ]
        },
        keywords: [
          'var', 'let', 'const', 'function', 'return', 'if', 'else', 
          'for', 'while', 'do', 'break', 'continue', 'switch', 'case',
          'default', 'throw', 'try', 'catch', 'finally', 'new', 'typeof',
          'instanceof', 'true', 'false', 'null', 'undefined', 'async',
          'await', 'class', 'extends', 'super', 'this'
        ]
      });
      
      // Configure theme colors for variables
      monaco.editor.defineTheme('api-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'variable', foreground: 'FFA500', fontStyle: 'bold' }
        ],
        colors: {}
      });
      
      monaco.editor.defineTheme('api-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'variable', foreground: 'FF6600', fontStyle: 'bold' }
        ],
        colors: {}
      });
    }
    
    // Set up auto-completion for variables
    monaco.languages.registerCompletionItemProvider('api-javascript', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        const variables = resolveAllVariables();
        const suggestions = Object.entries(variables).map(([key, value]) => ({
          label: `{{${key}}}`,
          kind: monaco.languages.CompletionItemKind.Variable,
          documentation: `Current value: ${value}`,
          insertText: `{{${key}}}`,
          range: range
        }));
        
        return { suggestions };
      }
    });
    
    // Also provide completions for JSON
    monaco.languages.registerCompletionItemProvider('json', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        const variables = resolveAllVariables();
        const suggestions = Object.entries(variables).map(([key, value]) => ({
          label: `{{${key}}}`,
          kind: monaco.languages.CompletionItemKind.Variable,
          documentation: `Current value: ${value}`,
          insertText: `"{{${key}}}"`,
          range: range
        }));
        
        return { suggestions };
      }
    });
    
    // PM object type definitions for IntelliSense
    const pmLibSource = `
declare namespace pm {
  interface Request {
    url: string;
    method: string;
    headers: { [key: string]: string };
    body?: any;
  }
  
  interface Response {
    code: number;
    status: string;
    headers: { [key: string]: string };
    body: any;
    responseTime: number;
  }
  
  interface EnvironmentVariable {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    unset(key: string): void;
    has(key: string): boolean;
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
  }
  
  interface ChaiHave {
    property(name: string, value?: any): void;
    length(n: number): void;
    status(code: number): void;
  }
  
  const request: Request;
  const response: Response;
  const environment: EnvironmentVariable;
  const globals: EnvironmentVariable;
  const test: Test;
  const expect: Expect;
  
  function sendRequest(options: {
    url: string;
    method?: string;
    headers?: { [key: string]: string };
    body?: any;
  }): Promise<Response>;
}

declare const pm: typeof pm;
`;
    
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      pmLibSource,
      'pm.d.ts'
    );
    
    // Apply custom theme
    monaco.editor.setTheme(theme === 'vs-dark' ? 'api-dark' : 'api-light');
  };
  

  return (
    <Editor
      height={height}
      defaultLanguage={language === 'javascript' ? 'api-javascript' : language}
      value={value}
      onChange={onChange}
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
        placeholder
      }}
    />
  );
}