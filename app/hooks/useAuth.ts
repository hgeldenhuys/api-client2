import { useCallback } from 'react';
import { useAuthStore } from '~/stores/authStore';
import { Auth, AuthType } from '~/types/postman';

export function useAuth() {
  const {
    credentials,
    oauth2Tokens,
    activeSessions,
    storeCredentials,
    getCredentials,
    removeCredentials,
    storeOAuth2Token,
    getOAuth2Token,
    refreshOAuth2Token,
    createSession,
    getSession,
    clearSession,
    clearExpiredTokens,
    clearAll
  } = useAuthStore();
  
  // Helper to check if auth is configured for a request
  const hasAuth = useCallback((requestId: string): boolean => {
    const creds = getCredentials(requestId);
    return !!creds && creds.type !== 'noauth';
  }, [getCredentials]);
  
  // Helper to get auth type for a request
  const getAuthType = useCallback((requestId: string): AuthType | null => {
    const creds = getCredentials(requestId);
    return creds?.type || null;
  }, [getCredentials]);
  
  // Helper to check if OAuth2 token needs refresh
  const needsOAuth2Refresh = useCallback((clientId: string): boolean => {
    const token = getOAuth2Token(clientId);
    if (!token || !token.refreshToken) return false;
    
    // Check if token is expired or about to expire (5 minutes buffer)
    if (token.expiresIn) {
      const expiresAt = token.expiresIn;
      const bufferTime = 5 * 60 * 1000; // 5 minutes
      return Date.now() > (expiresAt - bufferTime);
    }
    
    return false;
  }, [getOAuth2Token]);
  
  // Helper to initiate OAuth2 flow
  const initiateOAuth2Flow = useCallback(async (
    clientId: string,
    authorizationUrl: string,
    redirectUri: string,
    scope?: string,
    state?: string
  ) => {
    // Build OAuth2 authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      ...(scope && { scope }),
      ...(state && { state })
    });
    
    const fullAuthUrl = `${authorizationUrl}?${params.toString()}`;
    
    // Store session for OAuth2 callback handling
    createSession(`oauth2-${clientId}`, 'oauth2', {
      clientId,
      redirectUri,
      state,
      authorizationUrl
    });
    
    // Open authorization URL in new window
    window.open(fullAuthUrl, 'oauth2-auth', 'width=600,height=700');
    
    return fullAuthUrl;
  }, [createSession]);
  
  // Helper to handle OAuth2 callback
  const handleOAuth2Callback = useCallback(async (
    code: string,
    state: string,
    tokenEndpoint: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ) => {
    try {
      // Exchange authorization code for token
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to exchange authorization code');
      }
      
      const tokenData = await response.json();
      
      // Store the token
      storeOAuth2Token(clientId, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope
      });
      
      // Clear the session
      clearSession(`oauth2-${clientId}`);
      
      return tokenData;
    } catch (error) {
      console.error('OAuth2 callback error:', error);
      throw error;
    }
  }, [storeOAuth2Token, clearSession]);
  
  // Helper to validate API key
  const validateApiKey = useCallback((key: string, value: string): boolean => {
    // Basic validation
    if (!key || !value) return false;
    
    // Check for common API key patterns
    if (key.toLowerCase().includes('api') || key.toLowerCase().includes('key')) {
      // Most API keys are at least 16 characters
      return value.length >= 16;
    }
    
    return true;
  }, []);
  
  return {
    // State
    credentials,
    oauth2Tokens,
    activeSessions,
    
    // Core methods
    storeCredentials,
    getCredentials,
    removeCredentials,
    storeOAuth2Token,
    getOAuth2Token,
    refreshOAuth2Token,
    createSession,
    getSession,
    clearSession,
    clearExpiredTokens,
    clearAll,
    
    // Helper methods
    hasAuth,
    getAuthType,
    needsOAuth2Refresh,
    initiateOAuth2Flow,
    handleOAuth2Callback,
    validateApiKey
  };
}