import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '~/cookies/theme.server';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark'; // The actual theme after resolving 'system'
  systemTheme: 'light' | 'dark';
  isInitialized: boolean;
  
  // Actions
  setTheme: (theme: ThemeMode) => void;
  initializeFromServer: (serverTheme: ThemeMode) => void;
  updateSystemTheme: (systemTheme: 'light' | 'dark') => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') {
    return 'light'; // Default for SSR
  }
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const resolveTheme = (theme: ThemeMode, systemTheme: 'light' | 'dark'): 'light' | 'dark' => {
  return theme === 'system' ? systemTheme : theme;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      systemTheme: 'light',
      isInitialized: false,
      
      setTheme: (theme: ThemeMode) => {
        const { systemTheme } = get();
        const resolvedTheme = resolveTheme(theme, systemTheme);
        
        set({ theme, resolvedTheme });
        
        // Update cookie on client-side
        if (typeof window !== 'undefined') {
          document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        }
      },
      
      initializeFromServer: (serverTheme: ThemeMode) => {
        const systemTheme = getSystemTheme();
        const resolvedTheme = resolveTheme(serverTheme, systemTheme);
        
        set({ 
          theme: serverTheme, 
          resolvedTheme, 
          systemTheme, 
          isInitialized: true 
        });
      },
      
      updateSystemTheme: (systemTheme: 'light' | 'dark') => {
        const { theme } = get();
        const resolvedTheme = resolveTheme(theme, systemTheme);
        
        set({ systemTheme, resolvedTheme });
      },
      
      getEffectiveTheme: () => {
        const { theme, systemTheme } = get();
        return resolveTheme(theme, systemTheme);
      }
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ 
        theme: state.theme 
      }), // Only persist the theme preference, not system state
    }
  )
);

// Hook for components to use
export const useTheme = () => {
  const store = useThemeStore();
  
  // Initialize system theme detection on client
  React.useEffect(() => {
    if (typeof window !== 'undefined' && store.isInitialized) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        store.updateSystemTheme(e.matches ? 'dark' : 'light');
      };
      
      // Set initial system theme
      store.updateSystemTheme(mediaQuery.matches ? 'dark' : 'light');
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [store.isInitialized]);
  
  return store;
};

