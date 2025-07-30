import React from 'react';
import { useLocation, useNavigate } from 'react-router';

interface ViewRouterProps {
  collectionView: React.ReactNode;
  environmentView: React.ReactNode;
  documentationView?: React.ReactNode;
  bugReportView?: React.ReactNode;
  globalsView?: React.ReactNode;
  settingsView?: React.ReactNode;
}

export type ViewType = 'collection' | 'environment' | 'documentation' | 'bugreport' | 'globals' | 'settings';

export function ViewRouter({ 
  collectionView, 
  environmentView, 
  documentationView,
  bugReportView,
  globalsView, 
  settingsView 
}: ViewRouterProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse the hash to get the current view
  const hash = location.hash.slice(1); // Remove the # character
  const currentView = (hash || 'collection') as ViewType;
  
  // Validate the view
  const validViews = ['collection', 'environment', 'documentation', 'bugreport', 'globals', 'settings'];
  const view = validViews.includes(currentView) ? currentView : 'collection';
  
  // Set up hash change listener
  React.useEffect(() => {
    const handleHashChange = () => {
      // Force re-render when hash changes
      navigate(window.location.pathname + window.location.hash);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [navigate]);
  
  // Set up keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + number combinations
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            navigate('#collection');
            break;
          case '2':
            e.preventDefault();
            navigate('#environment');
            break;
          case '3':
            if (documentationView) {
              e.preventDefault();
              navigate('#documentation');
            }
            break;
          case '4':
            if (bugReportView) {
              e.preventDefault();
              navigate('#bugreport');
            }
            break;
          case '5':
            if (globalsView) {
              e.preventDefault();
              navigate('#globals');
            }
            break;
          case '6':
            if (settingsView) {
              e.preventDefault();
              navigate('#settings');
            }
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, documentationView, bugReportView, globalsView, settingsView]);
  
  // Render the appropriate view
  switch (view) {
    case 'environment':
      return <>{environmentView}</>;
    case 'documentation':
      return <>{documentationView || <div className="p-8 text-center text-muted-foreground">Documentation view coming soon...</div>}</>;
    case 'bugreport':
      return <>{bugReportView || <div className="p-8 text-center text-muted-foreground">Bug report view coming soon...</div>}</>;
    case 'globals':
      return <>{globalsView || <div className="p-8 text-center text-muted-foreground">Globals view coming soon...</div>}</>;
    case 'settings':
      return <>{settingsView || <div className="p-8 text-center text-muted-foreground">Settings view coming soon...</div>}</>;
    case 'collection':
    default:
      return <>{collectionView}</>;
  }
}

// Hook to get current view
export function useCurrentView(): ViewType {
  const location = useLocation();
  const hash = location.hash.slice(1);
  const validViews = ['collection', 'environment', 'documentation', 'bugreport', 'globals', 'settings'];
  return validViews.includes(hash) ? (hash as ViewType) : 'collection';
}

// Hook to navigate to a view
export function useViewNavigation() {
  const navigate = useNavigate();
  
  return {
    navigateToCollection: () => navigate('#collection'),
    navigateToEnvironment: () => navigate('#environment'),
    navigateToDocumentation: () => navigate('#documentation'),
    navigateToBugReport: () => navigate('#bugreport'),
    navigateToGlobals: () => navigate('#globals'),
    navigateToSettings: () => navigate('#settings'),
    navigateToView: (view: ViewType) => navigate(`#${view}`),
  };
}
