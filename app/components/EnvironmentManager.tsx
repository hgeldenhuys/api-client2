import React from 'react';
import { useEnvironmentStore } from '~/stores/environmentStore';
import { useCollectionStore } from '~/stores/collectionStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Settings, Globe, Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { useViewNavigation, useCurrentView } from '~/components/ViewRouter';

export function EnvironmentManager() {
  const {
    environments,
    activeEnvironmentId,
    globalVariables,
    setActiveEnvironment,
  } = useEnvironmentStore();
  
  const { activeCollectionId, collections } = useCollectionStore();
  
  const { navigateToSettings } = useViewNavigation();
  const currentView = useCurrentView();
  
  // Get active environment - handle Map access issues
  const activeEnvironment = activeEnvironmentId ? (
    environments && typeof environments.get === 'function'
      ? environments.get(activeEnvironmentId)
      : Array.from(environments.values()).find(env => env.id === activeEnvironmentId)
  ) : null;
  
  // Count variables and secrets
  const varCount = activeEnvironment?.values ? Object.keys(activeEnvironment.values).length : 0;
  const secretCount = activeEnvironment?.secretKeys?.length || 0;
  const globalCount = globalVariables.filter(v => v.enabled).length;
  
  // Get collection variables count
  const collectionVariables = activeCollectionId 
    ? collections.get(activeCollectionId)?.collection.variable || []
    : [];
  const collectionVarCount = collectionVariables.filter(v => !v.disabled).length;
  
  return (
    <div className="flex items-center gap-3">
      {/* Environment Selector */}
      <div className="flex items-center gap-2">
        <Select 
          value={activeEnvironmentId || 'none'}
          onValueChange={(value) => setActiveEnvironment(value === 'none' ? null : value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="No Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">No Environment</span>
            </SelectItem>
            {Array.from(environments.values()).map(env => (
              <SelectItem key={env.id} value={env.id}>
                {env.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Variable Counts */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {/* Collection Variables */}
            {collectionVarCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="gap-1">
                    <span className="text-xs">C</span>
                    {collectionVarCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Collection Variables</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Environment Variables */}
            {varCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1">
                    <span className="text-xs">E</span>
                    {varCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Environment Variables</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Secrets */}
            {secretCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    {secretCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Secrets</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Global Variables */}
            {globalCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1">
                    <Globe className="h-3 w-3" />
                    {globalCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Global Variables</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentView === 'settings' ? 'default' : 'ghost'}
                size="icon"
                onClick={navigateToSettings}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
