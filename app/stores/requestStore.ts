import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { RequestExecution, ScriptResult } from '~/types/request';
import { Request as PostmanRequest } from '~/types/postman';

interface RequestState {
  // Active request state
  activeRequest: PostmanRequest | null;
  activeRequestId: string | null;
  isLoading: boolean;
  currentResponse: RequestExecution | null;
  abortController: AbortController | null;
  
  // Request history
  history: Map<string, RequestExecution[]>;
  
  // Responses by request ID
  responses: Map<string, RequestExecution>;
  
  // Script results
  preRequestScriptResult: ScriptResult | null;
  testScriptResult: ScriptResult | null;
  
  // CORS error tracking
  lastCorsError: { url: string; timestamp: number } | null;
  
  // Actions
  setActiveRequest: (request: PostmanRequest | null, requestId?: string | null) => void;
  setLoading: (loading: boolean) => void;
  setResponse: (response: RequestExecution | null) => void;
  
  // History management
  addToHistory: (requestId: string, execution: RequestExecution) => void;
  getRequestHistory: (requestId: string) => RequestExecution[];
  clearHistory: (requestId?: string) => void;
  
  // Response management
  getResponseForRequest: (requestId: string) => RequestExecution | null;
  saveResponseForRequest: (requestId: string, response: RequestExecution) => void;
  clearResponseForRequest: (requestId: string) => void;
  
  // Script results
  setPreRequestScriptResult: (result: ScriptResult | null) => void;
  setTestScriptResult: (result: ScriptResult | null) => void;
  
  // CORS error handling
  setLastCorsError: (error: { url: string; timestamp: number } | null) => void;
  
  // Request execution
  executeRequest: (request: PostmanRequest, requestId: string, scripts?: { preRequest?: string; test?: string }) => Promise<void>;
  abortRequest: () => void;
}

export const useRequestStore = create<RequestState>()(
  devtools(
    immer((set, get) => ({
      activeRequest: null,
      activeRequestId: null,
      isLoading: false,
      currentResponse: null,
      abortController: null,
      history: new Map(),
      responses: new Map(),
      preRequestScriptResult: null,
      testScriptResult: null,
      lastCorsError: null,
      
      setActiveRequest: (request, requestId) => {
        set((state) => {
          state.activeRequest = request;
          state.activeRequestId = requestId || null;
          // Load saved response for this request if available
          if (requestId) {
            state.currentResponse = state.responses.get(requestId) || null;
          } else {
            state.currentResponse = null;
          }
          state.preRequestScriptResult = null;
          state.testScriptResult = null;
        });
      },
      
      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },
      
      setResponse: (response) => {
        set((state) => {
          state.currentResponse = response;
        });
      },
      
      addToHistory: (requestId, execution) => {
        set((state) => {
          if (!state.history.has(requestId)) {
            state.history.set(requestId, []);
          }
          const history = state.history.get(requestId)!;
          history.unshift(execution);
          
          // Keep only last 20 executions per request
          if (history.length > 20) {
            history.splice(20);
          }
        });
      },
      
      getRequestHistory: (requestId) => {
        const state = get();
        return state.history.get(requestId) || [];
      },
      
      clearHistory: (requestId) => {
        set((state) => {
          if (requestId) {
            state.history.delete(requestId);
          } else {
            state.history.clear();
          }
        });
      },
      
      getResponseForRequest: (requestId) => {
        const state = get();
        return state.responses.get(requestId) || null;
      },
      
      saveResponseForRequest: (requestId, response) => {
        set((state) => {
          state.responses.set(requestId, response);
        });
      },
      
      clearResponseForRequest: (requestId) => {
        set((state) => {
          state.responses.delete(requestId);
        });
      },
      
      setPreRequestScriptResult: (result) => {
        set((state) => {
          state.preRequestScriptResult = result;
        });
      },
      
      setTestScriptResult: (result) => {
        set((state) => {
          state.testScriptResult = result;
        });
      },
      
      setLastCorsError: (error) => {
        set((state) => {
          state.lastCorsError = error;
        });
      },
      
      executeRequest: async (request, requestId, scripts) => {
        const { setLoading, setResponse, addToHistory, saveResponseForRequest, setPreRequestScriptResult, setTestScriptResult } = get();
        const { requestExecutor } = await import('~/services/requestExecutor');
        
        // Create new abort controller
        const controller = new AbortController();
        set((state) => {
          state.abortController = controller;
        });
        
        setLoading(true);
        setPreRequestScriptResult(null);
        setTestScriptResult(null);
        
        try {
          const executor = requestExecutor;
          const response = await executor.execute({
            request,
            // TODO: Get these from collection context
            collectionAuth: undefined,
            collectionVariables: {},
            preRequestScript: scripts?.preRequest,
            testScript: scripts?.test,
            signal: controller.signal
          });
          
          setResponse(response);
          addToHistory(response.requestId, response);
          saveResponseForRequest(requestId, response);
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log('Request aborted');
          } else {
            console.error('Request execution error:', error);
          }
          // Error response is already handled in executor
        } finally {
          setLoading(false);
          set((state) => {
            state.abortController = null;
          });
        }
      },
      
      abortRequest: () => {
        const { abortController } = get();
        if (abortController) {
          abortController.abort();
          set((state) => {
            state.isLoading = false;
            state.abortController = null;
          });
        }
      }
    }))
  )
);