import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { StorageService } from '~/services/storage/storageService';

export type ProxyStatus = 'connected' | 'disconnected' | 'checking';

interface ProxyConfig {
  isEnabled: boolean;
  proxyUrl: string;
  autoDetectCors: boolean;
  username?: string;
  password?: string;
  sslVerification: 'default' | 'ignore' | 'strict';
}

interface ProxyState extends ProxyConfig {
  proxyStatus: ProxyStatus;
  lastChecked?: Date;
  isInitialized: boolean;
  
  // Actions
  init: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
  setProxyUrl: (url: string) => void;
  setAutoDetectCors: (enabled: boolean) => void;
  setCredentials: (username: string, password: string) => void;
  setSslVerification: (mode: 'default' | 'ignore' | 'strict') => void;
  checkProxyConnection: () => Promise<boolean>;
  setProxyStatus: (status: ProxyStatus) => void;
  save: () => Promise<void>;
}

const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  isEnabled: false,
  proxyUrl: 'http://localhost:9090',
  autoDetectCors: true,
  sslVerification: 'default'
};

export const useProxyStore = create<ProxyState>()(
  immer((set, get) => ({
    ...DEFAULT_PROXY_CONFIG,
    proxyStatus: 'disconnected',
    isInitialized: false,

    init: async () => {
      const state = get();
      if (state.isInitialized) return;
      
      try {
        const storage = new StorageService();
        // Ensure storage is initialized
        if (!storage.getIsInitialized()) {
          await storage.init();
        }
        const savedConfig = await storage.getProxyConfig();
        
        if (savedConfig) {
          set((state) => {
            Object.assign(state, savedConfig);
          });
        }
        
        set((state) => {
          state.isInitialized = true;
        });
        
        // Check proxy connection if enabled
        if (savedConfig?.isEnabled) {
          get().checkProxyConnection();
        }
      } catch (error) {
        console.error('Failed to initialize proxy store:', error);
        set((state) => {
          state.isInitialized = true;
        });
      }
    },

    setEnabled: (enabled: boolean) => {
      set((state) => {
        state.isEnabled = enabled;
      });
      get().save();
      
      if (enabled) {
        get().checkProxyConnection();
      } else {
        set((state) => {
          state.proxyStatus = 'disconnected';
        });
      }
    },

    setProxyUrl: (url: string) => {
      set((state) => {
        state.proxyUrl = url;
      });
      get().save();
    },

    setAutoDetectCors: (enabled: boolean) => {
      set((state) => {
        state.autoDetectCors = enabled;
      });
      get().save();
    },

    setCredentials: (username: string, password: string) => {
      set((state) => {
        state.username = username;
        state.password = password;
      });
      get().save();
    },

    setSslVerification: (mode: 'default' | 'ignore' | 'strict') => {
      set((state) => {
        state.sslVerification = mode;
      });
      get().save();
    },

    checkProxyConnection: async () => {
      const state = get();
      if (!state.proxyUrl) {
        set((draft) => {
          draft.proxyStatus = 'disconnected';
        });
        return false;
      }

      set((draft) => {
        draft.proxyStatus = 'checking';
      });

      try {
        // Try to connect to the proxy health endpoint
        const healthUrl = new URL('/health', state.proxyUrl).toString();
        const response = await fetch(healthUrl, {
          method: 'GET',
          // Short timeout for health check
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          set((draft) => {
            draft.proxyStatus = 'connected';
            draft.lastChecked = new Date();
          });
          return true;
        } else {
          throw new Error('Proxy health check failed');
        }
      } catch (error) {
        console.error('Proxy connection check failed:', error);
        set((draft) => {
          draft.proxyStatus = 'disconnected';
          draft.lastChecked = new Date();
        });
        return false;
      }
    },

    setProxyStatus: (status: ProxyStatus) => {
      set((state) => {
        state.proxyStatus = status;
      });
    },

    save: async () => {
      try {
        const state = get();
        const storage = new StorageService();
        
        const config: ProxyConfig = {
          isEnabled: state.isEnabled,
          proxyUrl: state.proxyUrl,
          autoDetectCors: state.autoDetectCors,
          username: state.username,
          password: state.password,
          sslVerification: state.sslVerification
        };
        
        await storage.saveProxyConfig(config);
      } catch (error) {
        console.error('Failed to save proxy config:', error);
      }
    }
  }))
);