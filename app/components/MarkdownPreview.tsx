import React from 'react';
import Markdown from 'react-markdown';
import { cn } from '~/lib/utils';

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  return (
    <div className={cn(
      "prose prose-sm dark:prose-invert max-w-none p-4",
      "prose-headings:scroll-mt-4",
      "prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4",
      "prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3",
      "prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-5 prose-h3:mb-2",
      "prose-p:my-3 prose-p:leading-relaxed",
      "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
      "prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground/30 prose-blockquote:pl-4 prose-blockquote:italic",
      "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
      "prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto",
      "prose-pre:text-sm prose-pre:leading-relaxed",
      "prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6",
      "prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6",
      "prose-li:my-1",
      "prose-table:my-4 prose-table:border-collapse",
      "prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:bg-muted",
      "prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2",
      "prose-img:rounded-lg prose-img:my-4",
      "prose-hr:my-6 prose-hr:border-border",
      className
    )}>
      <Markdown
        components={{
          // Custom components for better styling
          pre: ({ children, ...props }) => (
            <pre className="overflow-x-auto" {...props}>
              {children}
            </pre>
          ),
          code: ({ children, className, ...props }) => {
            // Check if it's an inline code or code block
            const isInline = !className;
            return (
              <code 
                className={cn(
                  isInline ? "bg-muted px-1.5 py-0.5 rounded text-sm" : className
                )} 
                {...props}
              >
                {children}
              </code>
            );
          },
          // Ensure links open in new tab for security
          a: ({ children, href, ...props }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary no-underline hover:underline"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}