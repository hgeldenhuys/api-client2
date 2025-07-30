import React from 'react';

interface MainLayoutProps {
  topBar?: React.ReactNode;
  children: React.ReactNode;
}

export function MainLayout({ topBar, children }: MainLayoutProps) {
  return (
    <div className="h-screen w-full bg-background flex flex-col">
      {topBar && (
        <div className="h-14 border-b bg-background flex items-center px-4">
          {topBar}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}