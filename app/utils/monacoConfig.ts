import { loader } from '@monaco-editor/react';

// Configure Monaco to use local assets instead of CDN  
// Only load monaco-editor on the client side to avoid SSR issues
if (typeof window !== 'undefined') {
  // vite-plugin-monaco-editor handles worker configuration
  // No need for manual worker setup as the plugin manages this
  
  // Configure loader to use bundled monaco-editor instead of CDN
  loader.config({ 
    paths: { 
      vs: '/node_modules/monaco-editor/min/vs' 
    }
  });
}