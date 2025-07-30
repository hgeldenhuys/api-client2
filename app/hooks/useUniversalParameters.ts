import React from 'react';
import { UniversalParameter } from '~/types/postman';
import { parseUrl, buildUrl } from '~/utils/urlParser';
import { convertToUniversalParameters, groupParametersByLocation } from '~/utils/parameterLocations';

export interface UseUniversalParametersOptions {
  url: string;
  onUrlChange: (url: string) => void;
  onHeadersChange?: (headers: Array<{ key: string; value: string; enabled: boolean }>) => void;
  onBodyChange: (mode: string, content: string) => void;
  isInitialLoad: boolean;
}

export function useUniversalParameters({
  url,
  onUrlChange,
  onHeadersChange,
  onBodyChange,
  isInitialLoad
}: UseUniversalParametersOptions) {
  const [parameters, setParameters] = React.useState<UniversalParameter[]>([]);
  const [isUrlSyncEnabled, setIsUrlSyncEnabled] = React.useState(true);
  const [isUpdatingFromParams, setIsUpdatingFromParams] = React.useState(false);
  const [isUpdatingFromUrl, setIsUpdatingFromUrl] = React.useState(false);
  const [lastUrlValue, setLastUrlValue] = React.useState(url);
  const [lastParametersHash, setLastParametersHash] = React.useState('');

  // Create stable hash for parameters to detect changes
  const createParametersHash = React.useCallback((params: UniversalParameter[]) => {
    return JSON.stringify(params.map(p => `${p.id}:${p.key}:${p.value}:${p.location}:${p.enabled}`));
  }, []);

  // URL to params synchronization (only when URL changes externally)
  React.useEffect(() => {
    if (!isUrlSyncEnabled || isInitialLoad || isUpdatingFromParams || url === lastUrlValue) return;
    
    setLastUrlValue(url);
    setIsUpdatingFromUrl(true);
    
    const parsed = parseUrl(url);
    if (parsed.isValid) {
      const currentQueryParams = parameters.filter(p => p.location === 'query');
      const queryParamsChanged = 
        parsed.queryParams.length !== currentQueryParams.length ||
        parsed.queryParams.some((newParam, index) => 
          !currentQueryParams[index] || 
          currentQueryParams[index].key !== newParam.key || 
          currentQueryParams[index].value !== newParam.value
        );
      
      if (queryParamsChanged) {
        const nonQueryParams = parameters.filter(p => p.location !== 'query');
        setParameters([...nonQueryParams, ...parsed.queryParams]);
      }
    }
    
    setTimeout(() => setIsUpdatingFromUrl(false), 50);
  }, [url, isUrlSyncEnabled, isInitialLoad, isUpdatingFromParams, lastUrlValue, parameters]);

  // Params to URL synchronization (debounced)
  const syncUrlFromParams = React.useCallback(() => {
    if (!isUrlSyncEnabled || isUpdatingFromUrl) return;
    
    const currentHash = createParametersHash(parameters);
    if (currentHash === lastParametersHash) return;
    
    setIsUpdatingFromParams(true);
    setLastParametersHash(currentHash);
    
    const newUrl = buildUrl(url, parameters);
    if (newUrl !== url) {
      setLastUrlValue(newUrl);
      onUrlChange(newUrl);
    }
    
    setTimeout(() => setIsUpdatingFromParams(false), 50);
  }, [url, parameters, isUrlSyncEnabled, isUpdatingFromUrl, createParametersHash, lastParametersHash, onUrlChange]);

  // Debounced URL sync
  const debouncedUrlSync = React.useRef<NodeJS.Timeout | null>(null);
  React.useEffect(() => {
    if (!isInitialLoad && !isUpdatingFromUrl) {
      if (debouncedUrlSync.current) {
        clearTimeout(debouncedUrlSync.current);
      }
      debouncedUrlSync.current = setTimeout(() => {
        syncUrlFromParams();
      }, 300);
    }

    return () => {
      if (debouncedUrlSync.current) {
        clearTimeout(debouncedUrlSync.current);
      }
    };
  }, [parameters, syncUrlFromParams, isInitialLoad, isUpdatingFromUrl]);

  // Sync to headers and body (separate from parameter updates)
  const syncToOtherFields = React.useRef<NodeJS.Timeout | null>(null);
  React.useEffect(() => {
    if (isInitialLoad || isUpdatingFromUrl) return;

    if (syncToOtherFields.current) {
      clearTimeout(syncToOtherFields.current);
    }

    syncToOtherFields.current = setTimeout(() => {
      const grouped = groupParametersByLocation(parameters);
      
      // Headers are now managed directly through universal parameters  
      // Only sync if onHeadersChange callback is provided (backward compatibility)
      if (onHeadersChange) {
        const headerParams = grouped.header
          .filter(p => p.enabled && p.key.trim())
          .map(p => ({
            key: p.key,
            value: p.value,
            enabled: p.enabled
          }));
        onHeadersChange(headerParams);
      }

      // Sync body
      const formDataParams = grouped['form-data'].filter(p => p.enabled && p.key.trim());
      const urlencodedParams = grouped.urlencoded.filter(p => p.enabled && p.key.trim());
      
      if (formDataParams.length > 0) {
        onBodyChange('form-data', '');
      } else if (urlencodedParams.length > 0) {
        const formBody = urlencodedParams
          .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
        onBodyChange('x-www-form-urlencoded', formBody);
      }
    }, 500); // Longer delay for other field sync

    return () => {
      if (syncToOtherFields.current) {
        clearTimeout(syncToOtherFields.current);
      }
    };
  }, [parameters, isInitialLoad, isUpdatingFromUrl, onHeadersChange, onBodyChange]);

  // Stable parameter change handler
  const handleParametersChange = React.useCallback((newParameters: UniversalParameter[]) => {
    setParameters(newParameters);
  }, []);

  // Load parameters from request data
  const loadParameters = React.useCallback((requestData: any) => {
    let loadedParams: UniversalParameter[] = [];
    
    // NEW: Load from universalParameters field first (primary source)
    if (requestData.universalParameters && Array.isArray(requestData.universalParameters)) {
      loadedParams = [...requestData.universalParameters];
    } else {
      // Fallback: Convert from legacy header/url/body format
      
      // Load headers as parameters
      if (requestData.request?.header) {
        const headerParams = convertToUniversalParameters(
          requestData.request.header.map((h: any) => ({
            key: h.key,
            value: h.value,
            enabled: !h.disabled
          })),
          'header'
        );
        loadedParams.push(...headerParams);
      }
      
      // Load query parameters from URL
      const urlString = typeof requestData.request?.url === 'string' 
        ? requestData.request.url 
        : requestData.request?.url?.raw || '';
      const parsed = parseUrl(urlString);
      if (parsed.isValid && parsed.queryParams.length > 0) {
        loadedParams.push(...parsed.queryParams);
      }
      
      // Load body parameters
      if (requestData.request?.body?.mode === 'x-www-form-urlencoded' && requestData.request.body.raw) {
        const urlencodedParams = new URLSearchParams(requestData.request.body.raw);
        urlencodedParams.forEach((value, key) => {
          loadedParams.push({
            id: `param-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            key,
            value,
            location: 'urlencoded',
            enabled: true,
            type: 'text'
          });
        });
      }
    }
    
    setParameters(loadedParams);
    setLastParametersHash(createParametersHash(loadedParams));
  }, [createParametersHash]);

  return {
    parameters,
    setParameters: handleParametersChange,
    loadParameters,
    isUrlSyncEnabled,
    setIsUrlSyncEnabled
  };
}