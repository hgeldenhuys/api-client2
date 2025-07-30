import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Auth, AuthType } from '~/types/postman';
import { TIMEOUTS, DURATIONS } from '~/constants';

interface AuthCredentials {
  id: string;
  type: AuthType;
  credentials: Record<string, string>;
  expiresAt?: number;
  refreshToken?: string;
  metadata?: Record<string, any>;
}

interface OAuth2Token {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
}

interface AuthState {
  // Stored credentials by collection/request ID
  credentials: Map<string, AuthCredentials>;
  
  // OAuth2 tokens by client ID
  oauth2Tokens: Map<string, OAuth2Token>;
  
  // Active auth sessions
  activeSessions: Map<string, {
    authType: AuthType;
    sessionData: any;
    createdAt: number;
  }>;
  
  // Methods
  storeCredentials: (id: string, auth: Auth) => void;
  getCredentials: (id: string) => AuthCredentials | undefined;
  removeCredentials: (id: string) => void;
  
  // OAuth2 specific methods
  storeOAuth2Token: (clientId: string, token: OAuth2Token) => void;
  getOAuth2Token: (clientId: string) => OAuth2Token | undefined;
  refreshOAuth2Token: (clientId: string, refreshToken: string) => Promise<OAuth2Token | null>;
  
  // Session management
  createSession: (id: string, authType: AuthType, sessionData: any) => void;
  getSession: (id: string) => any;
  clearSession: (id: string) => void;
  
  // Utility methods
  isTokenExpired: (expiresAt?: number) => boolean;
  clearExpiredTokens: () => void;
  clearAll: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      credentials: new Map(),
      oauth2Tokens: new Map(),
      activeSessions: new Map(),
      
      storeCredentials: (id, auth) => {
        if (!auth || auth.type === 'noauth') {
          get().removeCredentials(id);
          return;
        }
        
        const credentials: AuthCredentials = {
          id,
          type: auth.type,
          credentials: {},
          metadata: {}
        };
        
        // Extract credentials based on auth type
        switch (auth.type) {
          case 'bearer':
            if (auth.bearer) {
              credentials.credentials.token = auth.bearer.find(p => p.key === 'token')?.value || '';
            }
            break;
            
          case 'basic':
            if (auth.basic) {
              credentials.credentials.username = auth.basic.find(p => p.key === 'username')?.value || '';
              credentials.credentials.password = auth.basic.find(p => p.key === 'password')?.value || '';
            }
            break;
            
          case 'apikey':
            if (auth.apikey) {
              credentials.credentials.key = auth.apikey.find(p => p.key === 'key')?.value || '';
              credentials.credentials.value = auth.apikey.find(p => p.key === 'value')?.value || '';
              credentials.credentials.in = auth.apikey.find(p => p.key === 'in')?.value || 'header';
            }
            break;
            
          case 'oauth2':
            if (auth.oauth2) {
              credentials.credentials.accessToken = auth.oauth2.find(p => p.key === 'accessToken')?.value || '';
              credentials.credentials.clientId = auth.oauth2.find(p => p.key === 'clientId')?.value || '';
              credentials.credentials.clientSecret = auth.oauth2.find(p => p.key === 'clientSecret')?.value || '';
              credentials.credentials.grantType = auth.oauth2.find(p => p.key === 'grant_type')?.value || 'authorization_code';
              
              const refreshToken = auth.oauth2.find(p => p.key === 'refreshToken')?.value;
              if (refreshToken) {
                credentials.refreshToken = refreshToken;
              }
            }
            break;
            
          case 'jwt':
            if (auth.jwt) {
              credentials.credentials.token = auth.jwt.find(p => p.key === 'token')?.value || '';
              credentials.credentials.prefix = auth.jwt.find(p => p.key === 'prefix')?.value || 'Bearer';
            }
            break;
            
          // Add other auth types as needed
        }
        
        set(state => ({
          credentials: new Map(state.credentials).set(id, credentials)
        }));
      },
      
      getCredentials: (id) => {
        return get().credentials.get(id);
      },
      
      removeCredentials: (id) => {
        set(state => {
          const newCredentials = new Map(state.credentials);
          newCredentials.delete(id);
          return { credentials: newCredentials };
        });
      },
      
      storeOAuth2Token: (clientId, token) => {
        const expiresAt = token.expiresIn 
          ? Date.now() + (token.expiresIn * DURATIONS.ONE_SECOND)
          : undefined;
          
        set(state => ({
          oauth2Tokens: new Map(state.oauth2Tokens).set(clientId, {
            ...token,
            expiresAt
          } as any)
        }));
      },
      
      getOAuth2Token: (clientId) => {
        const token = get().oauth2Tokens.get(clientId);
        if (!token) return undefined;
        
        // Check if token is expired
        if (token.expiresIn && get().isTokenExpired(token.expiresIn)) {
          // If we have a refresh token, we could trigger a refresh here
          // For now, just return undefined to indicate no valid token
          return undefined;
        }
        
        return token;
      },
      
      refreshOAuth2Token: async (clientId, refreshToken) => {
        // This would need to be implemented based on the OAuth2 provider
        // For now, return null to indicate refresh not implemented
        console.warn('OAuth2 token refresh not implemented yet');
        return null;
      },
      
      createSession: (id, authType, sessionData) => {
        set(state => ({
          activeSessions: new Map(state.activeSessions).set(id, {
            authType,
            sessionData,
            createdAt: Date.now()
          })
        }));
      },
      
      getSession: (id) => {
        const session = get().activeSessions.get(id);
        return session?.sessionData;
      },
      
      clearSession: (id) => {
        set(state => {
          const newSessions = new Map(state.activeSessions);
          newSessions.delete(id);
          return { activeSessions: newSessions };
        });
      },
      
      isTokenExpired: (expiresAt) => {
        if (!expiresAt) return false;
        return Date.now() > expiresAt;
      },
      
      clearExpiredTokens: () => {
        set(state => {
          const newCredentials = new Map<string, AuthCredentials>();
          const newOAuth2Tokens = new Map<string, OAuth2Token>();
          
          // Clear expired credentials
          state.credentials.forEach((cred, id) => {
            if (!cred.expiresAt || !get().isTokenExpired(cred.expiresAt)) {
              newCredentials.set(id, cred);
            }
          });
          
          // Clear expired OAuth2 tokens
          state.oauth2Tokens.forEach((token, clientId) => {
            if (!token.expiresIn || !get().isTokenExpired(token.expiresIn)) {
              newOAuth2Tokens.set(clientId, token);
            }
          });
          
          return {
            credentials: newCredentials,
            oauth2Tokens: newOAuth2Tokens
          };
        });
      },
      
      clearAll: () => {
        set({
          credentials: new Map(),
          oauth2Tokens: new Map(),
          activeSessions: new Map()
        });
      }
    }),
    {
      name: 'auth-store',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              credentials: new Map(state.credentials || []),
              oauth2Tokens: new Map(state.oauth2Tokens || []),
              activeSessions: new Map(state.activeSessions || [])
            }
          };
        },
        setItem: (name, value) => {
          const { state } = value as any;
          const serialized = {
            state: {
              ...state,
              credentials: Array.from(state.credentials.entries()),
              oauth2Tokens: Array.from(state.oauth2Tokens.entries()),
              activeSessions: Array.from(state.activeSessions.entries())
            }
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
);

// Auto-clear expired tokens on store initialization
if (typeof window !== 'undefined') {
  useAuthStore.getState().clearExpiredTokens();
  
  // Set up periodic cleanup every 5 minutes
  setInterval(() => {
    useAuthStore.getState().clearExpiredTokens();
  }, TIMEOUTS.TOKEN_CLEANUP_INTERVAL);
}