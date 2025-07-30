import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { devtools } from 'zustand/middleware';
import * as jsonpatch from 'fast-json-patch';
import { storageService } from '~/services/storage/storageService';
import { TIMEOUTS } from '~/constants';

// Enable Map/Set support for Immer
enableMapSet();
import type { Operation } from 'fast-json-patch';
import { 
  PostmanCollection, 
  RequestItem, 
  FolderItem, 
  isRequestItem,
  isFolderItem 
} from '~/types/postman';
import { CollectionWithMetadata, CollectionMetadata } from '~/types/request';

interface CollectionState {
  collections: Map<string, CollectionWithMetadata>;
  activeCollectionId: string | null;
  isInitialized: boolean;
  
  // Computed getters for current collection state
  activeRequestId: string | null;
  openTabs: string[];
  
  // Actions
  init: () => Promise<void>;
  addCollection: (collection: PostmanCollection, metadata?: Partial<CollectionMetadata>) => Promise<string>;
  updateCollection: (id: string, updates: Partial<PostmanCollection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  setActiveCollection: (id: string | null) => void;
  setActiveRequest: (id: string | null) => void;
  
  // Request operations
  addRequest: (collectionId: string, parentId: string | null, request: RequestItem) => void;
  updateRequest: (collectionId: string, requestId: string, updates: Partial<RequestItem>) => void;
  deleteRequest: (collectionId: string, requestId: string) => void;
  renameRequest: (collectionId: string, requestId: string, newName: string) => void;
  
  // Folder operations
  addFolder: (collectionId: string, parentId: string | null, folder: FolderItem) => void;
  updateFolder: (collectionId: string, folderId: string, updates: Partial<FolderItem>) => void;
  deleteFolder: (collectionId: string, folderId: string) => void;
  toggleFolderExpansion: (collectionId: string, folderId: string) => void;
  
  // Tab management
  openTab: (requestId: string) => void;
  closeTab: (requestId: string) => void;
  closeAllTabs: () => void;
  
  // Delta sync
  applyDelta: (collectionId: string, delta: Operation[]) => void;
  
  // Utilities
  findRequestById: (collectionId: string, requestId: string) => RequestItem | null;
  findFolderById: (collectionId: string, folderId: string) => FolderItem | null;
  findItemPath: (collectionId: string, itemId: string) => (RequestItem | FolderItem)[];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function findItemInTree(
  items: (RequestItem | FolderItem)[],
  itemId: string,
  isFolder: boolean
): RequestItem | FolderItem | null {
  for (const item of items) {
    if (isFolder && isFolderItem(item) && item.id === itemId) {
      return item;
    }
    if (!isFolder && isRequestItem(item) && item.id === itemId) {
      return item;
    }
    if (isFolderItem(item)) {
      const found = findItemInTree(item.item, itemId, isFolder);
      if (found) return found;
    }
  }
  return null;
}

function findItemPath(
  items: (RequestItem | FolderItem)[],
  itemId: string,
  currentPath: (RequestItem | FolderItem)[] = []
): (RequestItem | FolderItem)[] | null {
  for (const item of items) {
    const newPath = [...currentPath, item];
    
    if ((isRequestItem(item) || isFolderItem(item)) && item.id === itemId) {
      return newPath;
    }
    
    if (isFolderItem(item)) {
      const found = findItemPath(item.item, itemId, newPath);
      if (found) return found;
    }
  }
  return null;
}

function addItemToTree(
  items: (RequestItem | FolderItem)[],
  parentId: string | null,
  newItem: RequestItem | FolderItem
): void {
  if (!parentId) {
    items.push(newItem);
    return;
  }
  
  for (const item of items) {
    if (isFolderItem(item) && item.id === parentId) {
      item.item.push(newItem);
      return;
    }
    if (isFolderItem(item)) {
      addItemToTree(item.item, parentId, newItem);
    }
  }
}

function removeItemFromTree(
  items: (RequestItem | FolderItem)[],
  itemId: string
): boolean {
  const index = items.findIndex(item => 
    (isRequestItem(item) || isFolderItem(item)) && item.id === itemId
  );
  
  if (index !== -1) {
    items.splice(index, 1);
    return true;
  }
  
  for (const item of items) {
    if (isFolderItem(item)) {
      if (removeItemFromTree(item.item, itemId)) {
        return true;
      }
    }
  }
  
  return false;
}

// Auto-save debounce delay
const AUTO_SAVE_DELAY = TIMEOUTS.AUTO_SAVE_DELAY;

let autoSaveTimer: NodeJS.Timeout | null = null;

function debounceAutoSave(fn: () => Promise<void>) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(fn, AUTO_SAVE_DELAY);
}

export const useCollectionStore = create<CollectionState>()(
  devtools(
    immer((set, get) => ({
      collections: new Map(),
      activeCollectionId: null,
      isInitialized: false,
      activeRequestId: null,
      openTabs: [],
      
      init: async () => {
        const state = get();
        if (state.isInitialized) return;
        
        try {
          await storageService.init();
          const collections = await storageService.getAllCollections();
          
          set((state) => {
            state.collections.clear();
            for (const collection of collections) {
              const id = collection.info._postman_id || generateId();
              state.collections.set(id, {
                collection,
                metadata: {
                  id,
                  name: collection.info.name,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  version: collection.info.schema || '2.1.0',
                }
              });
            }
            state.isInitialized = true;
          });
        } catch (error) {
          console.error('Failed to initialize collection store:', error);
        }
      },
      
      addCollection: async (collection, metadata) => {
        const id = collection.info._postman_id || metadata?.id || generateId();
        const now = Date.now();
        
        // Update collection with ID
        collection.info._postman_id = id;
        
        set((state) => {
          state.collections.set(id, {
            collection,
            metadata: {
              id,
              name: collection.info.name,
              createdAt: metadata?.createdAt || now,
              updatedAt: metadata?.updatedAt || now,
              version: collection.info.schema || '2.1.0',
              activeRequestId: metadata?.activeRequestId || null,
              activeEnvironmentId: metadata?.activeEnvironmentId || null,
              openTabs: metadata?.openTabs || [],
              expandedFolders: metadata?.expandedFolders || [],
              ...metadata
            }
          });
          
          if (!state.activeCollectionId) {
            state.activeCollectionId = id;
          }
        });
        
        // Save to storage
        try {
          await storageService.saveCollection(collection);
        } catch (error) {
          console.error('Failed to save collection:', error);
        }
        
        return id;
      },
      
      updateCollection: async (id, updates) => {
        set((state) => {
          const collectionData = state.collections.get(id);
          if (collectionData) {
            Object.assign(collectionData.collection, updates);
            collectionData.metadata.updatedAt = Date.now();
          }
        });
        
        // Auto-save with debounce
        debounceAutoSave(async () => {
          const state = get();
          const collectionData = state.collections.get(id);
          if (collectionData) {
            try {
              await storageService.saveCollection(collectionData.collection);
            } catch (error) {
              console.error('Failed to auto-save collection:', error);
            }
          }
        });
      },
      
      deleteCollection: async (id) => {
        set((state) => {
          state.collections.delete(id);
          if (state.activeCollectionId === id) {
            state.activeCollectionId = null;
          }
        });
        
        // Delete from storage
        try {
          await storageService.deleteCollection(id);
        } catch (error) {
          console.error('Failed to delete collection from storage:', error);
        }
      },
      
      setActiveCollection: (id) => {
        set((state) => {
          state.activeCollectionId = id;
          
          if (id) {
            const collection = state.collections.get(id);
            if (collection) {
              state.activeRequestId = collection.metadata.activeRequestId || null;
              state.openTabs = collection.metadata.openTabs || [];
            }
          } else {
            state.activeRequestId = null;
            state.openTabs = [];
          }
        });
      },
      
      setActiveRequest: (id) => {
        set((state) => {
          state.activeRequestId = id;
          
          if (state.activeCollectionId) {
            const collection = state.collections.get(state.activeCollectionId);
            if (collection) {
              collection.metadata.activeRequestId = id;
              
              // Ensure the tab is open
              if (id && !collection.metadata.openTabs?.includes(id)) {
                if (!collection.metadata.openTabs) {
                  collection.metadata.openTabs = [];
                }
                collection.metadata.openTabs.push(id);
              }
              
              collection.metadata.updatedAt = Date.now();
              
              // Update top-level openTabs
              state.openTabs = collection.metadata.openTabs || [];
            }
          }
        });
      },
      
      addRequest: (collectionId, parentId, request) => {
        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            if (!request.id) request.id = generateId();
            addItemToTree(collectionData.collection.item, parentId, request);
            collectionData.metadata.updatedAt = Date.now();
          }
        });
        
        // Auto-save
        debounceAutoSave(async () => {
          const state = get();
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            try {
              await storageService.saveCollection(collectionData.collection);
            } catch (error) {
              console.error('Failed to auto-save collection:', error);
            }
          }
        });
      },
      
      updateRequest: (collectionId, requestId, updates) => {
        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            const request = findItemInTree(
              collectionData.collection.item, 
              requestId, 
              false
            ) as RequestItem;
            if (request) {
              Object.assign(request, updates);
              collectionData.metadata.updatedAt = Date.now();
            }
          }
        });
        
        // Auto-save
        debounceAutoSave(async () => {
          const state = get();
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            try {
              await storageService.saveCollection(collectionData.collection);
            } catch (error) {
              console.error('Failed to auto-save collection:', error);
            }
          }
        });
      },
      
      deleteRequest: (collectionId, requestId) => {
        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            removeItemFromTree(collectionData.collection.item, requestId);
            collectionData.metadata.updatedAt = Date.now();
            
            // Update per-collection state
            if (collectionData.metadata.activeRequestId === requestId) {
              collectionData.metadata.activeRequestId = null;
            }
            if (collectionData.metadata.openTabs) {
              collectionData.metadata.openTabs = collectionData.metadata.openTabs.filter(id => id !== requestId);
            }
          }
        });
        
        // Auto-save
        debounceAutoSave(async () => {
          const state = get();
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            try {
              await storageService.saveCollection(collectionData.collection);
            } catch (error) {
              console.error('Failed to auto-save collection:', error);
            }
          }
        });
      },
      
      renameRequest: (collectionId, requestId, newName) => {
        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            const request = findItemInTree(
              collectionData.collection.item, 
              requestId, 
              false
            ) as RequestItem;
            if (request) {
              request.name = newName;
              collectionData.metadata.updatedAt = Date.now();
            }
          }
        });
        
        // Auto-save
        debounceAutoSave(async () => {
          const state = get();
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            try {
              await storageService.saveCollection(collectionData.collection);
            } catch (error) {
              console.error('Failed to auto-save collection:', error);
            }
          }
        });
      },
      
      addFolder: (collectionId, parentId, folder) => {
        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            if (!folder.id) folder.id = generateId();
            addItemToTree(collectionData.collection.item, parentId, folder);
            collectionData.metadata.updatedAt = Date.now();
          }
        });
      },
      
      updateFolder: (collectionId, folderId, updates) => {
        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            const folder = findItemInTree(
              collectionData.collection.item, 
              folderId, 
              true
            ) as FolderItem;
            if (folder) {
              Object.assign(folder, updates);
              collectionData.metadata.updatedAt = Date.now();
            }
          }
        });
      },
      
      deleteFolder: (collectionId, folderId) => {
        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            removeItemFromTree(collectionData.collection.item, folderId);
            collectionData.metadata.updatedAt = Date.now();
          }
        });
      },
      
      toggleFolderExpansion: (collectionId, folderId) => {
        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            if (!collectionData.metadata.expandedFolders) {
              collectionData.metadata.expandedFolders = [];
            }
            const index = collectionData.metadata.expandedFolders.indexOf(folderId);
            if (index >= 0) {
              collectionData.metadata.expandedFolders.splice(index, 1);
            } else {
              collectionData.metadata.expandedFolders.push(folderId);
            }
            collectionData.metadata.updatedAt = Date.now();
          }
        });
      },
      
      openTab: (tabId) => {
        set((state) => {
          // Extract collection and request IDs from tab ID (format: collectionId:requestId)
          const [collectionId, requestId] = tabId.split(':');
          if (!collectionId || !requestId) return;
          
          const collection = state.collections.get(collectionId);
          if (collection) {
            if (!collection.metadata.openTabs) {
              collection.metadata.openTabs = [];
            }
            
            if (!collection.metadata.openTabs.includes(requestId)) {
              collection.metadata.openTabs.push(requestId);
            }
            
            collection.metadata.activeRequestId = requestId;
            collection.metadata.updatedAt = Date.now();
            
            // Update top-level state
            state.activeRequestId = requestId;
            state.openTabs = collection.metadata.openTabs;
          }
        });
      },
      
      closeTab: (tabId) => {
        set((state) => {
          // Handle both formats: requestId or collectionId:requestId
          let collectionId: string;
          let requestId: string;
          
          if (tabId.includes(':')) {
            [collectionId, requestId] = tabId.split(':');
          } else {
            // Legacy format - just requestId
            requestId = tabId;
            collectionId = state.activeCollectionId || '';
          }
          
          if (!collectionId) return;
          
          const collection = state.collections.get(collectionId);
          if (collection && collection.metadata.openTabs) {
            const index = collection.metadata.openTabs.indexOf(requestId);
            if (index !== -1) {
              collection.metadata.openTabs.splice(index, 1);
              
              // Update active request if closing the active tab
              if (collection.metadata.activeRequestId === requestId) {
                collection.metadata.activeRequestId = 
                  collection.metadata.openTabs[index] || 
                  collection.metadata.openTabs[index - 1] || 
                  null;
              }
              
              collection.metadata.updatedAt = Date.now();
              
              // Update top-level state
              state.openTabs = collection.metadata.openTabs;
              if (state.activeRequestId === requestId) {
                state.activeRequestId = collection.metadata.activeRequestId || null;
              }
            }
          }
        });
      },
      
      closeAllTabs: () => {
        set((state) => {
          if (state.activeCollectionId) {
            const collection = state.collections.get(state.activeCollectionId);
            if (collection) {
              collection.metadata.openTabs = [];
              collection.metadata.activeRequestId = null;
              collection.metadata.updatedAt = Date.now();
            }
          }
          
          // Update top-level state
          state.openTabs = [];
          state.activeRequestId = null;
        });
      },
      
      applyDelta: (collectionId, delta) => {
        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            jsonpatch.applyPatch(collectionData.collection, delta);
            collectionData.metadata.updatedAt = Date.now();
          }
        });
      },
      
      findRequestById: (collectionId, requestId) => {
        const state = get();
        const collectionData = state.collections.get(collectionId);
        if (!collectionData) return null;
        
        return findItemInTree(
          collectionData.collection.item, 
          requestId, 
          false
        ) as RequestItem | null;
      },
      
      findFolderById: (collectionId, folderId) => {
        const state = get();
        const collectionData = state.collections.get(collectionId);
        if (!collectionData) return null;
        
        return findItemInTree(
          collectionData.collection.item, 
          folderId, 
          true
        ) as FolderItem | null;
      },
      
      findItemPath: (collectionId, itemId) => {
        const state = get();
        const collectionData = state.collections.get(collectionId);
        if (!collectionData) return [];
        
        return findItemPath(collectionData.collection.item, itemId) || [];
      }
    }))
  )
);