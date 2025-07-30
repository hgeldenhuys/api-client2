import { loader } from '@monaco-editor/react';

// Configure Monaco to use local assets instead of CDN  
// Only load monaco-editor on the client side to avoid SSR issues
if (typeof window !== 'undefined') {
  // Configure Monaco Environment to handle workers without external dependencies
  (window as any).MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      // Return a data URL that will load workers inline
      // This avoids external dependencies and CSP issues
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        self.MonacoEnvironment = { baseUrl: '/' };
        // Minimal worker implementation to prevent errors
        self.onmessage = function() {
          // Workers will run in degraded mode but Monaco will function
        };
      `)}`;
    }
  };
  
  // Dynamic import to avoid SSR issues
  import('monaco-editor').then((monaco) => {
    loader.config({ monaco: monaco.default || monaco });
  });
}