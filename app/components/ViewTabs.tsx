import React from 'react';
import { useCurrentView, useViewNavigation, ViewType } from '~/components/ViewRouter';
import { cn } from '~/utils/cn';
import { Folder, Globe, BookOpen, Bug } from 'lucide-react';
import { useApiClientConfig } from '~/components/ConfigProvider';

interface ViewTab {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
}

const VIEW_TABS: ViewTab[] = [
  {
    id: 'collection',
    label: 'Collections',
    icon: <Folder className="h-4 w-4" />,
    shortcut: '⌘1'
  },
  {
    id: 'environment',
    label: 'Environments',
    icon: <Globe className="h-4 w-4" />,
    shortcut: '⌘2'
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: <BookOpen className="h-4 w-4" />,
    shortcut: '⌘3'
  },
  {
    id: 'bugreport',
    label: 'Submit Bug',
    icon: <Bug className="h-4 w-4" />,
    shortcut: '⌘4'
  }
];

export function ViewTabs() {
  const currentView = useCurrentView();
  const { navigateToView } = useViewNavigation();
  const config = useApiClientConfig();
  
  // Filter tabs based on configuration
  const visibleTabs = VIEW_TABS.filter(tab => {
    if (tab.id === 'bugreport') {
      return config.bugReporting.enabled;
    }
    return true;
  });
  
  return (
    <div className="flex items-center gap-1">
      {/* Configurable Logo */}
      {config.branding.logo && (
        <div className="mr-4">
          {config.branding.logoLink ? (
            <a 
              href={config.branding.logoLink}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              {config.branding.logo}
            </a>
          ) : (
            <div className="flex items-center">
              {config.branding.logo}
            </div>
          )}
        </div>
      )}
      
      {visibleTabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => navigateToView(tab.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            currentView === tab.id && "bg-accent text-accent-foreground"
          )}
          title={`${tab.label} (${tab.shortcut})`}
        >
          {tab.icon}
          <span>{tab.label}</span>
          <span className="text-xs text-muted-foreground ml-1">{tab.shortcut}</span>
        </button>
      ))}
    </div>
  );
}
