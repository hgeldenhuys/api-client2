import React, { useRef, useEffect } from 'react';

interface HtmlPreviewProps {
  html: string;
  className?: string;
}

export function HtmlPreview({ html, className = '' }: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        // Add base styles to make content look good
        const styledHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  font-size: 14px;
                  line-height: 1.6;
                  color: #333;
                  padding: 16px;
                  margin: 0;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                }
                
                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                  body {
                    background-color: #1a1a1a;
                    color: #e0e0e0;
                  }
                  a {
                    color: #4fc3f7;
                  }
                  code {
                    background-color: #2d2d2d;
                    color: #e0e0e0;
                  }
                  pre {
                    background-color: #2d2d2d;
                    color: #e0e0e0;
                  }
                  blockquote {
                    border-left-color: #4a4a4a;
                    color: #b0b0b0;
                  }
                  table {
                    border-color: #4a4a4a;
                  }
                  th, td {
                    border-color: #4a4a4a;
                  }
                  th {
                    background-color: #2d2d2d;
                  }
                }
                
                /* Basic styling for common elements */
                h1, h2, h3, h4, h5, h6 {
                  margin-top: 24px;
                  margin-bottom: 16px;
                  font-weight: 600;
                }
                
                h1 { font-size: 2em; }
                h2 { font-size: 1.5em; }
                h3 { font-size: 1.25em; }
                
                p {
                  margin-top: 0;
                  margin-bottom: 16px;
                }
                
                a {
                  color: #0366d6;
                  text-decoration: none;
                }
                
                a:hover {
                  text-decoration: underline;
                }
                
                code {
                  padding: 2px 4px;
                  font-family: Consolas, Monaco, 'Courier New', monospace;
                  font-size: 0.9em;
                  background-color: #f6f8fa;
                  border-radius: 3px;
                }
                
                pre {
                  padding: 16px;
                  overflow: auto;
                  font-size: 0.9em;
                  line-height: 1.45;
                  background-color: #f6f8fa;
                  border-radius: 6px;
                }
                
                pre code {
                  display: inline;
                  padding: 0;
                  background-color: transparent;
                  border: 0;
                }
                
                blockquote {
                  padding: 0 1em;
                  margin: 0;
                  border-left: 4px solid #dfe2e5;
                  color: #6a737d;
                }
                
                table {
                  border-collapse: collapse;
                  width: 100%;
                  margin-bottom: 16px;
                }
                
                table, th, td {
                  border: 1px solid #dfe2e5;
                }
                
                th, td {
                  padding: 8px 12px;
                  text-align: left;
                }
                
                th {
                  background-color: #f6f8fa;
                  font-weight: 600;
                }
                
                img {
                  max-width: 100%;
                  height: auto;
                }
                
                hr {
                  border: 0;
                  height: 1px;
                  background-color: #e1e4e8;
                  margin: 24px 0;
                }
              </style>
            </head>
            <body>
              ${html}
            </body>
          </html>
        `;
        
        iframeDoc.open();
        iframeDoc.write(styledHtml);
        iframeDoc.close();
      }
    }
  }, [html]);
  
  return (
    <iframe
      ref={iframeRef}
      className={`w-full h-full border-0 ${className}`}
      title="HTML Preview"
      sandbox="allow-same-origin"
      // Security: Restrict capabilities
      // - allow-same-origin: Needed for styling and DOM access
      // - No allow-scripts: Prevents JavaScript execution
      // - No allow-forms: Prevents form submission
      // - No allow-popups: Prevents opening new windows
      // - No allow-top-navigation: Prevents navigation
    />
  );
}