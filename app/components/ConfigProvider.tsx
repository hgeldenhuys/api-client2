import React from 'react';
import { ApiClientConfig, DEFAULT_CONFIG } from '~/types/config';

const ConfigContext = React.createContext<ApiClientConfig>(DEFAULT_CONFIG);

interface ConfigProviderProps {
  readonly config?: Partial<ApiClientConfig>;
  readonly children: React.ReactNode;
}

export function ConfigProvider({ config, children }: ConfigProviderProps) {
  // Deep merge the provided config with defaults
  const mergedConfig: ApiClientConfig = React.useMemo(() => {
    if (!config) return DEFAULT_CONFIG;
    
    return {
      branding: {
        ...DEFAULT_CONFIG.branding,
        ...config.branding,
      },
      repository: {
        ...DEFAULT_CONFIG.repository,
        ...config.repository,
      },
      support: {
        ...DEFAULT_CONFIG.support,
        ...config.support,
      },
      community: {
        ...DEFAULT_CONFIG.community,
        ...config.community,
      },
      bugReporting: {
        ...DEFAULT_CONFIG.bugReporting,
        ...config.bugReporting,
      },
    };
  }, [config]);

  return (
    <ConfigContext.Provider value={mergedConfig}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useApiClientConfig(): ApiClientConfig {
  const context = React.useContext(ConfigContext);
  if (!context) {
    throw new Error('useApiClientConfig must be used within a ConfigProvider');
  }
  return context;
}