import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { devtools } from "zustand/middleware";
import * as jsonpatch from "fast-json-patch";
import { storageService } from "~/services/storage/storageService";
import { TIMEOUTS } from "~/constants";

// Enable Map/Set support for Immer
enableMapSet();
import type { Operation } from "fast-json-patch";
import {
  PostmanCollection,
  RequestItem,
  FolderItem,
  isRequestItem,
  isFolderItem,
} from "~/types/postman";
import { CollectionWithMetadata, CollectionMetadata } from "~/types/request";
import {
  FlatTreeItem,
  flattenTree,
  unflattenTree,
  canMoveItem,
  cloneTreeItem,
} from "~/utils/treeUtils";

interface CollectionState {
  collections: Map<string, CollectionWithMetadata>;
  activeCollectionId: string | null;
  isInitialized: boolean;

  // Computed getters for current collection state
  activeRequestId: string | null;
  openTabs: string[];

  // Clipboard state for copy/paste operations
  clipboard: {
    item: RequestItem | FolderItem | null;
    sourceCollectionId: string | null;
    timestamp: number;
  };

  // Actions
  init: () => Promise<void>;
  addCollection: (
    collection: PostmanCollection,
    metadata?: Partial<CollectionMetadata>,
  ) => Promise<string>;
  updateCollection: (
    id: string,
    updates: Partial<PostmanCollection>,
  ) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  setActiveCollection: (id: string | null) => void;
  setActiveRequest: (id: string | null) => void;

  // Request operations
  addRequest: (
    collectionId: string,
    parentId: string | null,
    request: RequestItem,
  ) => void;
  updateRequest: (
    collectionId: string,
    requestId: string,
    updates: Partial<RequestItem>,
  ) => void;
  deleteRequest: (collectionId: string, requestId: string) => void;
  renameRequest: (
    collectionId: string,
    requestId: string,
    newName: string,
  ) => void;

  // Folder operations
  addFolder: (
    collectionId: string,
    parentId: string | null,
    folder: FolderItem,
  ) => void;
  updateFolder: (
    collectionId: string,
    folderId: string,
    updates: Partial<FolderItem>,
  ) => void;
  deleteFolder: (collectionId: string, folderId: string) => void;
  toggleFolderExpansion: (collectionId: string, folderId: string) => void;

  // Tab management
  openTab: (requestId: string) => void;
  closeTab: (requestId: string) => void;
  closeAllTabs: () => void;

  // Delta sync
  applyDelta: (collectionId: string, delta: Operation[]) => void;

  // Drag and drop operations
  moveItem: (
    collectionId: string,
    draggedId: string,
    targetId: string,
    position: "before" | "after" | "inside",
  ) => boolean;
  reorderItems: (
    collectionId: string,
    parentId: string,
    oldIndex: number,
    newIndex: number,
  ) => void;

  // Copy/paste and duplicate operations
  duplicateItem: (
    collectionId: string,
    itemId: string,
    parentId?: string,
  ) => string | null;
  copyToClipboard: (collectionId: string, itemId: string) => void;
  pasteFromClipboard: (
    collectionId: string,
    parentId: string | null,
  ) => string | null;

  // Utilities
  findRequestById: (
    collectionId: string,
    requestId: string,
  ) => RequestItem | null;
  findFolderById: (collectionId: string, folderId: string) => FolderItem | null;
  findItemPath: (
    collectionId: string,
    itemId: string,
  ) => (RequestItem | FolderItem)[];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function findItemInTree(
  items: (RequestItem | FolderItem)[],
  itemId: string,
  isFolder: boolean,
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
  currentPath: (RequestItem | FolderItem)[] = [],
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
  newItem: RequestItem | FolderItem,
  position?: "start" | "end",
  targetIndex?: number,
): void {
  if (!parentId) {
    // Adding to root level
    if (
      targetIndex !== undefined &&
      targetIndex >= 0 &&
      targetIndex <= items.length
    ) {
      items.splice(targetIndex, 0, newItem);
    } else if (position === "start") {
      items.unshift(newItem);
    } else {
      items.push(newItem);
    }
    return;
  }

  for (const item of items) {
    if (isFolderItem(item) && item.id === parentId) {
      if (
        targetIndex !== undefined &&
        targetIndex >= 0 &&
        targetIndex <= item.item.length
      ) {
        item.item.splice(targetIndex, 0, newItem);
      } else if (position === "start") {
        item.item.unshift(newItem);
      } else {
        item.item.push(newItem);
      }
      return;
    }
    if (isFolderItem(item)) {
      addItemToTree(item.item, parentId, newItem, position, targetIndex);
    }
  }
}

function removeItemFromTree(
  items: (RequestItem | FolderItem)[],
  itemId: string,
): boolean {
  const index = items.findIndex(
    (item) => (isRequestItem(item) || isFolderItem(item)) && item.id === itemId,
  );

  if (index !== -1) {
    const removedItem = items.splice(index, 1)[0];
    return true;
  }

  for (const [i, item] of items.entries()) {
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
      clipboard: {
        item: null,
        sourceCollectionId: null,
        timestamp: 0,
      },

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
                  version: collection.info.schema || "2.1.0",
                },
              });
            }
            state.isInitialized = true;
          });
        } catch (error) {
          console.error("Failed to initialize collection store:", error);
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
              version: collection.info.schema || "2.1.0",
              activeRequestId: metadata?.activeRequestId || null,
              activeEnvironmentId: metadata?.activeEnvironmentId || null,
              openTabs: metadata?.openTabs || [],
              expandedFolders: metadata?.expandedFolders || [],
              ...metadata,
            },
          });

          if (!state.activeCollectionId) {
            state.activeCollectionId = id;
          }
        });

        // Save to storage
        try {
          await storageService.saveCollection(collection);
        } catch (error) {
          console.error("Failed to save collection:", error);
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
              console.error("Failed to auto-save collection:", error);
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
          console.error("Failed to delete collection from storage:", error);
        }
      },

      setActiveCollection: (id) => {
        set((state) => {
          state.activeCollectionId = id;

          if (id) {
            const collection = state.collections.get(id);
            if (collection) {
              state.activeRequestId =
                collection.metadata.activeRequestId || null;
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
              console.error("Failed to auto-save collection:", error);
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
              false,
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
              console.error("Failed to auto-save collection:", error);
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
              collectionData.metadata.openTabs =
                collectionData.metadata.openTabs.filter(
                  (id) => id !== requestId,
                );
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
              console.error("Failed to auto-save collection:", error);
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
              false,
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
              console.error("Failed to auto-save collection:", error);
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
              true,
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
            const index =
              collectionData.metadata.expandedFolders.indexOf(folderId);
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
          const [collectionId, requestId] = tabId.split(":");
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

          if (tabId.includes(":")) {
            [collectionId, requestId] = tabId.split(":");
          } else {
            // Legacy format - just requestId
            requestId = tabId;
            collectionId = state.activeCollectionId || "";
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
                state.activeRequestId =
                  collection.metadata.activeRequestId || null;
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

      // Drag and drop operations
      moveItem: (collectionId, draggedId, targetId, position) => {
        const state = get();
        const collectionData = state.collections.get(collectionId);
        if (!collectionData) return false;

        // Flatten the tree to work with dnd-kit structure
        const expandedFolders = collectionData.metadata.expandedFolders || [];
        const flatItems = flattenTree(
          collectionData.collection.item,
          collectionId,
          collectionData.collection.info.name,
          expandedFolders,
        );

        // Check if the move is valid
        const validation = canMoveItem(
          flatItems,
          draggedId,
          targetId,
          position,
        );
        if (!validation.success) return false;

        // Find the dragged item in the original tree
        const draggedItem =
          findItemInTree(collectionData.collection.item, draggedId, false) ||
          findItemInTree(collectionData.collection.item, draggedId, true);

        if (!draggedItem) return false;

        // Calculate all paths and positions BEFORE making any modifications
        let newParentId: string | null = null;
        let targetPath: (RequestItem | FolderItem)[] | null = null;
        let insertionIndex: number | undefined = undefined;
        let originalDraggedItemIndex: number | undefined = undefined;
        let originalDraggedParentId: string | null = null;

        // Find the current location of the dragged item
        const draggedPath = findItemPath(
          collectionData.collection.item,
          draggedId,
        );
        if (draggedPath && draggedPath.length > 1) {
          originalDraggedParentId =
            draggedPath[draggedPath.length - 2].id || null;
          const draggedParent = draggedPath[draggedPath.length - 2];
          if (isFolderItem(draggedParent)) {
            originalDraggedItemIndex = draggedParent.item.findIndex(
              (item) => item.id === draggedId,
            );
          }
        } else if (draggedPath) {
          // Dragged item is at root level
          originalDraggedParentId = null;
          originalDraggedItemIndex = collectionData.collection.item.findIndex(
            (item) => item.id === draggedId,
          );
        }

        if (position === "inside") {
          newParentId = targetId;
        } else {
          // Find the parent of the target item BEFORE removing anything
          targetPath = findItemPath(collectionData.collection.item, targetId);

          if (targetPath && targetPath.length > 1) {
            newParentId = targetPath[targetPath.length - 2].id || null;

            // Calculate insertion index for 'before' and 'after' positions
            const targetItem = targetPath[targetPath.length - 1];
            const parentItem = targetPath[targetPath.length - 2];

            if (isFolderItem(parentItem)) {
              const targetIndex = parentItem.item.findIndex(
                (item) => item.id === targetItem.id,
              );
              if (targetIndex !== -1) {
                insertionIndex =
                  position === "before" ? targetIndex : targetIndex + 1;

                // Adjust insertion index if we're moving within the same parent and the dragged item is before the target
                if (
                  originalDraggedParentId === newParentId &&
                  originalDraggedItemIndex !== undefined &&
                  originalDraggedItemIndex < targetIndex
                ) {
                  insertionIndex = insertionIndex - 1;
                }
              }
            }
          } else {
            // Target is at root level
            newParentId = null;

            const targetIndex = collectionData.collection.item.findIndex(
              (item) => item.id === targetId,
            );
            if (targetIndex !== -1) {
              insertionIndex =
                position === "before" ? targetIndex : targetIndex + 1;

              // Adjust insertion index if we're moving within root and the dragged item is before the target
              if (
                originalDraggedParentId === null &&
                originalDraggedItemIndex !== undefined &&
                originalDraggedItemIndex < targetIndex
              ) {
                insertionIndex = insertionIndex - 1;
              }
            }
          }
        }

        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (!collectionData) return;

          // Remove the item from its current location
          removeItemFromTree(collectionData.collection.item, draggedId);

          // Add the item to its new location
          addItemToTree(
            collectionData.collection.item,
            newParentId,
            draggedItem,
            undefined,
            insertionIndex,
          );

          // Update metadata to trigger reactivity
          collectionData.metadata.updatedAt = Date.now();
        });

        // Auto-save
        debounceAutoSave(async () => {
          const state = get();
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            try {
              await storageService.saveCollection(collectionData.collection);
            } catch (error) {
              console.error(
                "Failed to auto-save collection after move:",
                error,
              );
            }
          }
        });

        return true;
      },

      reorderItems: (collectionId, parentId, oldIndex, newIndex) => {
        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (!collectionData) return;

          // Find the parent container
          let items: (RequestItem | FolderItem)[];
          if (parentId === collectionId) {
            // Root level items
            items = collectionData.collection.item;
          } else {
            // Items within a folder
            const folder = findItemInTree(
              collectionData.collection.item,
              parentId,
              true,
            ) as FolderItem;
            if (!folder) return;
            items = folder.item;
          }

          // Reorder the items
          if (
            oldIndex >= 0 &&
            oldIndex < items.length &&
            newIndex >= 0 &&
            newIndex < items.length
          ) {
            const [movedItem] = items.splice(oldIndex, 1);
            items.splice(newIndex, 0, movedItem);
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
              console.error(
                "Failed to auto-save collection after reorder:",
                error,
              );
            }
          }
        });
      },

      // Copy/paste and duplicate operations
      duplicateItem: (collectionId, itemId, parentId) => {
        const state = get();
        const collectionData = state.collections.get(collectionId);
        if (!collectionData) return null;

        // Find the item to duplicate
        const originalItem =
          findItemInTree(collectionData.collection.item, itemId, false) ||
          findItemInTree(collectionData.collection.item, itemId, true);

        if (!originalItem) return null;

        // Clone the item
        const clonedItem = cloneTreeItem(originalItem);
        const newId = clonedItem.id || generateId();
        clonedItem.id = newId;

        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (!collectionData) return;

          // Determine parent - use provided parentId or same parent as original
          let targetParentId: string | null = parentId ?? null;
          if (parentId === undefined) {
            const itemPath = findItemPath(
              collectionData.collection.item,
              itemId,
            );
            targetParentId =
              itemPath && itemPath.length > 1
                ? itemPath[itemPath.length - 2].id || null
                : null;
          }

          // Add the duplicated item
          addItemToTree(
            collectionData.collection.item,
            targetParentId,
            clonedItem,
          );
          collectionData.metadata.updatedAt = Date.now();
        });

        // Auto-save
        debounceAutoSave(async () => {
          const state = get();
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            try {
              await storageService.saveCollection(collectionData.collection);
            } catch (error) {
              console.error(
                "Failed to auto-save collection after duplicate:",
                error,
              );
            }
          }
        });

        return newId;
      },

      copyToClipboard: (collectionId, itemId) => {
        const state = get();
        const collectionData = state.collections.get(collectionId);
        if (!collectionData) return;

        // Find the item to copy
        const item =
          findItemInTree(collectionData.collection.item, itemId, false) ||
          findItemInTree(collectionData.collection.item, itemId, true);

        if (!item) return;

        set((state) => {
          state.clipboard = {
            item: structuredClone(item), // Deep copy
            sourceCollectionId: collectionId,
            timestamp: Date.now(),
          };
        });
      },

      pasteFromClipboard: (collectionId, parentId) => {
        const state = get();
        const collectionData = state.collections.get(collectionId);
        if (!collectionData || !state.clipboard.item) return null;

        // Clone the clipboard item
        const clonedItem = cloneTreeItem(state.clipboard.item, "Pasted ");
        const newId = clonedItem.id || generateId();
        clonedItem.id = newId;

        set((state) => {
          const collectionData = state.collections.get(collectionId);
          if (!collectionData) return;

          // Add the pasted item
          addItemToTree(collectionData.collection.item, parentId, clonedItem);
          collectionData.metadata.updatedAt = Date.now();
        });

        // Auto-save
        debounceAutoSave(async () => {
          const state = get();
          const collectionData = state.collections.get(collectionId);
          if (collectionData) {
            try {
              await storageService.saveCollection(collectionData.collection);
            } catch (error) {
              console.error(
                "Failed to auto-save collection after paste:",
                error,
              );
            }
          }
        });

        return newId;
      },

      findRequestById: (collectionId, requestId) => {
        const state = get();
        const collectionData = state.collections.get(collectionId);
        if (!collectionData) return null;

        return findItemInTree(
          collectionData.collection.item,
          requestId,
          false,
        ) as RequestItem | null;
      },

      findFolderById: (collectionId, folderId) => {
        const state = get();
        const collectionData = state.collections.get(collectionId);
        if (!collectionData) return null;

        return findItemInTree(
          collectionData.collection.item,
          folderId,
          true,
        ) as FolderItem | null;
      },

      findItemPath: (collectionId, itemId) => {
        const state = get();
        const collectionData = state.collections.get(collectionId);
        if (!collectionData) return [];

        return findItemPath(collectionData.collection.item, itemId) || [];
      },
    })),
  ),
);
