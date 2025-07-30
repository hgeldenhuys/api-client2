import { useEffect, useRef, useState } from 'react';
import { useCollectionStore } from '~/stores/collectionStore';
import { UniversalParameter } from '~/types/postman';
import { createUniversalParameter } from '~/utils/parameterLocations';
import { 
  getLanguageFromContentType, 
  getContentTypeFromLanguage,
  isTextBasedContentType 
} from '~/utils/contentTypeLanguageMap';

interface UseContentTypeSyncOptions {
  activeRequestId: string | undefined;
  parameters: UniversalParameter[];
  onParametersChange: (parameters: UniversalParameter[]) => void;
  defaultLanguage?: string;
}

interface UseContentTypeSyncReturn {
  language: string;
  setLanguage: (language: string) => void;
  isTextBased: boolean;
}

/**
 * Hook to synchronize Monaco editor language with Content-Type header
 */
export function useContentTypeSync({
  activeRequestId,
  parameters,
  onParametersChange,
  defaultLanguage = 'json'
}: UseContentTypeSyncOptions): UseContentTypeSyncReturn {
  const [language, setLanguageState] = useState(defaultLanguage);
  const isUpdatingRef = useRef(false);

  // Find Content-Type header in parameters
  const contentTypeParam = parameters.find(
    param => param.location === 'header' && 
    param.key.toLowerCase() === 'content-type' &&
    param.enabled
  );

  const contentType = contentTypeParam?.value;
  const isTextBased = isTextBasedContentType(contentType);

  // Sync language when Content-Type header changes
  useEffect(() => {
    if (!contentType || isUpdatingRef.current) {
      return;
    }

    const detectedLanguage = getLanguageFromContentType(contentType);
    if (detectedLanguage !== language) {
      setLanguageState(detectedLanguage);
    }
  }, [contentType, language]);

  // Update language and Content-Type header
  const setLanguage = (newLanguage: string) => {
    if (!activeRequestId || isUpdatingRef.current) {
      return;
    }

    isUpdatingRef.current = true;
    setLanguageState(newLanguage);

    // Update or add Content-Type header
    const newContentType = getContentTypeFromLanguage(newLanguage);
    
    let updatedParameters: UniversalParameter[];
    
    if (contentTypeParam) {
      // Update existing Content-Type header
      updatedParameters = parameters.map(param => 
        param.id === contentTypeParam.id 
          ? { ...param, value: newContentType }
          : param
      );
    } else {
      // Add new Content-Type header
      const newParam = createUniversalParameter('Content-Type', newContentType, 'header');
      updatedParameters = [...parameters, newParam];
    }
    
    onParametersChange(updatedParameters);

    // Reset the flag after a brief delay to allow for state updates
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 100);
  };

  return {
    language,
    setLanguage,
    isTextBased
  };
}