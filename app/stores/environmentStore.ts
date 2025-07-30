import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { storageService } from '~/services/storage/storageService';
import { VariableResolver, type VariableContext } from '~/services/variableResolver';
import { MemoryProtection } from '~/services/security/memoryProtection';
import { RuntimeGuards } from '~/services/security/runtimeGuards';

export interface Environment {
  id: string;
  name: string;
  values: Record<string, string>;      // Regular variables
  secrets: Record<string, string>;      // Encrypted secrets (stored separately)
  secretKeys: string[];                 // List of keys that are secrets
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  type?: 'default' | 'secret';
  enabled: boolean;
}

interface EnvironmentState {
  environments: Map<string, Environment>;
  activeEnvironmentId: string | null;
  globalVariables: EnvironmentVariable[];
  isInitialized: boolean;
  
  // Initialization
  init: () => Promise<void>;
  
  // Environment management
  addEnvironment: (environment: Omit<Environment, 'id'>) => string;
  updateEnvironment: (id: string, updates: Partial<Environment>) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  setActiveEnvironment: (id: string | null) => void;
  duplicateEnvironment: (id: string, newName: string) => Promise<string>;
  
  // Variable management
  addVariable: (environmentId: string, variable: EnvironmentVariable) => void;
  updateVariable: (environmentId: string, key: string, updates: Partial<EnvironmentVariable>) => void;
  deleteVariable: (environmentId: string, key: string) => void;
  
  // Global variables
  addGlobalVariable: (variable: Omit<EnvironmentVariable, 'enabled'>) => void;
  updateGlobalVariable: (index: number, updates: Partial<EnvironmentVariable>) => void;
  deleteGlobalVariable: (index: number) => void;
  setGlobalVariable: (key: string, value: string, type?: 'default' | 'secret') => void;
  
  // Variable resolution
  resolveVariable: (key: string) => string | undefined;
  resolveAllVariables: () => Record<string, string>;
  replaceVariables: (text: string) => string;
  
  // Helper methods for useVariableContext
  updateEnvironmentVariable: (environmentId: string, key: string, value: string) => void;
  addEnvironmentVariable: (environmentId: string, key: string, value: string) => void;
  deleteEnvironmentVariable: (environmentId: string, key: string) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Auto-save debounce delay
const AUTO_SAVE_DELAY = 500; // 500ms for environment changes

let autoSaveTimer: NodeJS.Timeout | null = null;

function debounceAutoSave(fn: () => Promise<void>) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(fn, AUTO_SAVE_DELAY);
}

// Helper function to safely get environment from Map with fallback handling
function getEnvironmentById(environments: any, environmentId: string) {
  if (!environments || !environmentId) return null;
  
  // Try Map.get first
  if (typeof environments.get === 'function') {
    return environments.get(environmentId);
  }
  
  // Fallback to object access if environments is not a proper Map
  let env = (environments as any)[environmentId];
  
  // If it's still an object-like structure, try to iterate
  if (!env && typeof environments === 'object') {
    const envs = Object.values(environments);
    env = envs.find((e: any) => e?.id === environmentId);
  }
  
  return env;
}

export const useEnvironmentStore = create<EnvironmentState>()(
  devtools(
    immer((set, get) => ({
        environments: new Map(),
        activeEnvironmentId: null,
        globalVariables: [],
        isInitialized: false,
        
        init: async () => {
          const state = get();
          if (state.isInitialized) return;
          
          try {
            await storageService.init();
            const environments = await storageService.getAllEnvironments();
            const globalVariables = await storageService.getGlobalVariables();
            
            set((state) => {
              state.environments.clear();
              for (const env of environments) {
                state.environments.set(env.id, env);
              }
              state.globalVariables = globalVariables;
              state.isInitialized = true;
            });
            
            // Initialize proxy store after database is ready
            const { useProxyStore } = await import('~/stores/proxyStore');
            await useProxyStore.getState().init();
          } catch (error) {
            console.error('Failed to initialize environment store:', error);
          }
        },
        
        addEnvironment: (environment) => {
          const id = generateId();
          const env: Environment = {
            id,
            name: environment.name,
            values: environment.values || {},
            secrets: environment.secrets || {},
            secretKeys: environment.secretKeys || []
          };
          
          set((state) => {
            state.environments.set(env.id, env);
            if (!state.activeEnvironmentId) {
              state.activeEnvironmentId = id;
            }
          });
          
          // Save to storage asynchronously
          storageService.saveEnvironment(env).catch(error => {
            console.error('Failed to save environment:', error);
          });
          
          return id;
        },
        
        updateEnvironment: async (id, updates) => {
          set((state) => {
            const env = getEnvironmentById(state.environments, id);
            if (env) {
              Object.assign(env, updates);
            }
          });
          
          // Auto-save with debounce
          debounceAutoSave(async () => {
            const state = get();
            const env = getEnvironmentById(state.environments, id);
            if (env) {
              try {
                await storageService.saveEnvironment(env);
              } catch (error) {
                console.error('Failed to auto-save environment:', error);
              }
            }
          });
        },
        
        deleteEnvironment: async (id) => {
          set((state) => {
            state.environments.delete(id);
            if (state.activeEnvironmentId === id) {
              state.activeEnvironmentId = null;
            }
          });
          
          // Delete from storage
          try {
            await storageService.deleteEnvironment(id);
          } catch (error) {
            console.error('Failed to delete environment from storage:', error);
          }
        },
        
        setActiveEnvironment: (id) => {
          set((state) => {
            state.activeEnvironmentId = id;
          });
        },
        
        duplicateEnvironment: async (id, newName) => {
          const state = get();
          const sourceEnv = getEnvironmentById(state.environments, id);
          if (!sourceEnv) return '';
          
          const newId = generateId();
          const newEnv: Environment = {
            id: newId,
            name: newName,
            values: { ...sourceEnv.values },
            secrets: { ...sourceEnv.secrets },
            secretKeys: [...sourceEnv.secretKeys]
          };
          
          set((state) => {
            state.environments.set(newId, newEnv);
          });
          
          // Save to storage
          try {
            await storageService.saveEnvironment(newEnv);
          } catch (error) {
            console.error('Failed to save duplicated environment:', error);
          }
          
          return newId;
        },
        
        addVariable: (environmentId, variable) => {
          set((state) => {
            const env = getEnvironmentById(state.environments, environmentId);
            if (env) {
              const isSecret = variable.type === 'secret';
              
              if (variable.enabled) {
                if (isSecret) {
                  env.secrets[variable.key] = variable.value;
                  if (!env.secretKeys.includes(variable.key)) {
                    env.secretKeys.push(variable.key);
                  }
                  // Remove from regular values if it was there
                  delete env.values[variable.key];
                } else {
                  env.values[variable.key] = variable.value;
                  // Remove from secrets if it was there
                  delete env.secrets[variable.key];
                  env.secretKeys = env.secretKeys.filter((k: string) => k !== variable.key);
                }
              } else {
                // Delete from both when disabled
                delete env.values[variable.key];
                delete env.secrets[variable.key];
                env.secretKeys = env.secretKeys.filter((k: string) => k !== variable.key);
              }
            }
          });
          
          // Auto-save
          debounceAutoSave(async () => {
            const state = get();
            const env = getEnvironmentById(state.environments, environmentId);
            if (env) {
              try {
                await storageService.saveEnvironment(env);
              } catch (error) {
                console.error('Failed to save environment:', error);
              }
            }
          });
        },
        
        updateVariable: (environmentId, key, updates) => {
          set((state) => {
            const env = getEnvironmentById(state.environments, environmentId);
            if (env) {
              if (updates.value !== undefined) {
                env.values[key] = updates.value;
              }
              if (updates.enabled === false) {
                delete env.values[key];
              }
            }
          });
          
          // Auto-save
          debounceAutoSave(async () => {
            const state = get();
            const env = getEnvironmentById(state.environments, environmentId);
            if (env) {
              try {
                await storageService.saveEnvironment(env);
              } catch (error) {
                console.error('Failed to save environment:', error);
              }
            }
          });
        },
        
        deleteVariable: (environmentId, key) => {
          set((state) => {
            const env = getEnvironmentById(state.environments, environmentId);
            if (env) {
              delete env.values[key];
            }
          });
          
          // Auto-save
          debounceAutoSave(async () => {
            const state = get();
            const env = getEnvironmentById(state.environments, environmentId);
            if (env) {
              try {
                await storageService.saveEnvironment(env);
              } catch (error) {
                console.error('Failed to save environment:', error);
              }
            }
          });
        },
        
        addGlobalVariable: (variable) => {
          set((state) => {
            state.globalVariables.push({
              ...variable,
              enabled: true
            });
          });
          
          // Auto-save global variables
          debounceAutoSave(async () => {
            const state = get();
            try {
              await storageService.saveGlobalVariables(state.globalVariables);
            } catch (error) {
              console.error('Failed to save global variables:', error);
            }
          });
        },
        
        updateGlobalVariable: (index, updates) => {
          set((state) => {
            if (state.globalVariables[index]) {
              Object.assign(state.globalVariables[index], updates);
            }
          });
          
          // Auto-save global variables
          debounceAutoSave(async () => {
            const state = get();
            try {
              await storageService.saveGlobalVariables(state.globalVariables);
            } catch (error) {
              console.error('Failed to save global variables:', error);
            }
          });
        },
        
        deleteGlobalVariable: (index) => {
          set((state) => {
            state.globalVariables.splice(index, 1);
          });
          
          // Auto-save global variables
          debounceAutoSave(async () => {
            const state = get();
            try {
              await storageService.saveGlobalVariables(state.globalVariables);
            } catch (error) {
              console.error('Failed to save global variables:', error);
            }
          });
        },
        
        setGlobalVariable: (key, value, type = 'default') => {
          set((state) => {
            const existingIndex = state.globalVariables.findIndex(v => v.key === key);
            if (existingIndex >= 0) {
              state.globalVariables[existingIndex] = {
                key,
                value,
                type,
                enabled: true
              };
            } else {
              state.globalVariables.push({
                key,
                value,
                type,
                enabled: true
              });
            }
          });
          
          // Auto-save global variables
          debounceAutoSave(async () => {
            const state = get();
            try {
              await storageService.saveGlobalVariables(state.globalVariables);
            } catch (error) {
              console.error('Failed to save global variables:', error);
            }
          });
        },
        
        resolveVariable: MemoryProtection.createSecureWrapper((key) => {
          const state = get();
          
          // Check active environment first - handle Map access issues
          if (state.activeEnvironmentId) {
            const env = getEnvironmentById(state.environments, state.activeEnvironmentId);
            
            if (env) {
              // Check regular values first, then secrets
              if (env.values && env.values[key] !== undefined) {
                return env.values[key];
              }
              if (env.secrets && env.secrets[key] !== undefined) {
                return env.secrets[key];
              }
            }
          }
          
          // Check global variables
          if (state.globalVariables && Array.isArray(state.globalVariables)) {
            const globalVar = state.globalVariables.find(v => v.key === key);
            if (globalVar && globalVar.enabled) {
              return globalVar.value;
            }
          }
          
          return undefined;
        }),
        
        resolveAllVariables: MemoryProtection.createSecureWrapper(() => {
          const state = get();
          const rawVariables: Record<string, string> = {};
          
          // Add global variables first
          if (state.globalVariables && Array.isArray(state.globalVariables)) {
            state.globalVariables.forEach((variable) => {
              if (variable.enabled) {
                rawVariables[variable.key] = variable.value;
              }
            });
          }
          
          // Override with environment variables - handle Map access issues
          if (state.activeEnvironmentId) {
            const env = getEnvironmentById(state.environments, state.activeEnvironmentId);
            
            if (env) {
              // Add regular variables
              if (env.values) {
                Object.entries(env.values).forEach(([key, value]) => {
                  rawVariables[key] = value as string;
                });
              }
              // Add secrets (they override regular variables)
              if (env.secrets) {
                Object.entries(env.secrets).forEach(([key, value]) => {
                  rawVariables[key] = value as string;
                });
              }
            }
          }
          
          // Build variable context for recursive resolution
          const context: VariableContext = {
            globals: {},
            environment: {},
            secrets: {}
          };
          
          // Separate variables by type for proper resolution order
          if (state.globalVariables && Array.isArray(state.globalVariables)) {
            state.globalVariables.forEach((variable) => {
              if (variable.enabled) {
                context.globals![variable.key] = variable.value;
              }
            });
          }
          
          if (state.activeEnvironmentId) {
            const env = getEnvironmentById(state.environments, state.activeEnvironmentId);
            if (env) {
              context.environment = env.values || {};
              context.secrets = env.secrets || {};
            }
          }
          
          // Recursively resolve each variable
          const resolved: Record<string, string> = {};
          Object.entries(rawVariables).forEach(([key, value]) => {
            // Use VariableResolver to resolve nested variables
            resolved[key] = VariableResolver.resolve(value, context);
          });
          
          // Mark result as sensitive and schedule clearing
          MemoryProtection.markSensitive(resolved);
          MemoryProtection.scheduleClearing(resolved, 30000);
          
          return resolved;
        }),
        
        replaceVariables: (text) => {
          const state = get();
          
          // Build variable context
          const context: VariableContext = {
            globals: {},
            environment: {},
            secrets: {}
          };
          
          // Add global variables
          if (state.globalVariables && Array.isArray(state.globalVariables)) {
            state.globalVariables.forEach((variable) => {
              if (variable.enabled) {
                context.globals![variable.key] = variable.value;
              }
            });
          }
          
          // Add environment variables and secrets - handle Map access issues
          if (state.activeEnvironmentId) {
            const env = getEnvironmentById(state.environments, state.activeEnvironmentId);
            
            if (env) {
              context.environment = env.values || {};
              context.secrets = env.secrets || {};
            }
          }
          
          // Use VariableResolver for recursive resolution
          return VariableResolver.resolve(text, context);
        },
        
        // Helper methods for useVariableContext
        updateEnvironmentVariable: (environmentId, key, value) => {
          get().updateVariable(environmentId, key, { value });
        },
        
        addEnvironmentVariable: (environmentId, key, value) => {
          get().addVariable(environmentId, {
            key,
            value,
            type: 'default',
            enabled: true
          });
        },
        
        deleteEnvironmentVariable: (environmentId, key) => {
          get().deleteVariable(environmentId, key);
        }
      }))
  )
);

// Install runtime protection for the environment store
if (typeof window !== 'undefined') {
  RuntimeGuards.protectStore('environmentStore', useEnvironmentStore);
  RuntimeGuards.installGlobalProtection();
  MemoryProtection.installAccessMonitor();
}