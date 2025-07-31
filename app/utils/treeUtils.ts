import { RequestItem, FolderItem, isRequestItem, isFolderItem } from '~/types/postman';

export interface FlatTreeItem {
  id: string;
  name: string;
  type: 'collection' | 'folder' | 'request';
  parentId: string | null;
  collectionId: string;
  depth: number;
  index: number;
  sortOrder: number;
  children: string[];
  collapsed?: boolean;
  data: RequestItem | FolderItem | { name: string; id: string }; // Collection data for collection type
}

export interface TreeOperationResult {
  success: boolean;
  error?: string;
  sourceItem?: FlatTreeItem;
  targetParent?: FlatTreeItem;
}

/**
 * Flatten a hierarchical tree structure into a flat array for dnd-kit
 */
export function flattenTree(
  items: (RequestItem | FolderItem)[],
  collectionId: string,
  collectionName: string,
  expandedFolders: string[] = [],
  parentId: string | null = null,
  depth: number = 0
): FlatTreeItem[] {
  const result: FlatTreeItem[] = [];
  
  // Add collection as root item if we're at the top level
  if (depth === 0) {
    result.push({
      id: collectionId,
      name: collectionName,
      type: 'collection',
      parentId: null,
      collectionId,
      depth: 0,
      index: 0,
      sortOrder: 0,
      children: items.map(item => item.id || ''),
      data: { name: collectionName, id: collectionId }
    });
    depth = 1;
  }

  items.forEach((item, index) => {
    const itemId = item.id || '';
    const isExpanded = expandedFolders.includes(itemId);
    
    const flatItem: FlatTreeItem = {
      id: itemId,
      name: item.name,
      type: isRequestItem(item) ? 'request' : 'folder',
      parentId: parentId || collectionId,
      collectionId,
      depth,
      index,
      sortOrder: index,
      children: isFolderItem(item) ? item.item.map(child => child.id || '') : [],
      collapsed: isFolderItem(item) ? !isExpanded : undefined,
      data: item
    };
    
    result.push(flatItem);
    
    // Recursively add children if folder is expanded
    if (isFolderItem(item) && isExpanded) {
      const childItems = flattenTree(
        item.item,
        collectionId,
        collectionName,
        expandedFolders,
        itemId,
        depth + 1
      );
      result.push(...childItems);
    }
  });
  
  return result;
}

/**
 * Rebuild hierarchical structure from flat array
 */
export function unflattenTree(
  flatItems: FlatTreeItem[],
  collectionId: string
): (RequestItem | FolderItem)[] {
  const itemMap = new Map<string, FlatTreeItem>();
  const result: (RequestItem | FolderItem)[] = [];
  
  // Build lookup map
  flatItems.forEach(item => {
    if (item.collectionId === collectionId) {
      itemMap.set(item.id, item);
    }
  });
  
  // Find root items (direct children of collection)
  const rootItems = flatItems.filter(
    item => item.collectionId === collectionId && 
            item.parentId === collectionId && 
            item.type !== 'collection'
  );
  
  function buildItem(flatItem: FlatTreeItem): RequestItem | FolderItem {
    const baseItem = flatItem.data as RequestItem | FolderItem;
    
    if (flatItem.type === 'folder') {
      const folderItem = baseItem as FolderItem;
      const children: (RequestItem | FolderItem)[] = [];
      
      // Find direct children of this folder
      const childItems = flatItems.filter(item => item.parentId === flatItem.id);
      childItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .forEach(child => {
          children.push(buildItem(child));
        });
      
      return {
        ...folderItem,
        item: children
      };
    }
    
    return baseItem;
  }
  
  // Build root level items
  rootItems
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach(item => {
      result.push(buildItem(item));
    });
  
  return result;
}

/**
 * Find an item in the flat tree by ID
 */
export function findFlatTreeItem(
  flatItems: FlatTreeItem[],
  itemId: string
): FlatTreeItem | null {
  return flatItems.find(item => item.id === itemId) || null;
}

/**
 * Get all descendants of an item
 */
export function getDescendants(
  flatItems: FlatTreeItem[],
  parentId: string
): FlatTreeItem[] {
  const descendants: FlatTreeItem[] = [];
  const parent = findFlatTreeItem(flatItems, parentId);
  
  if (!parent) return descendants;
  
  function addDescendants(itemId: string) {
    const children = flatItems.filter(item => item.parentId === itemId);
    children.forEach(child => {
      descendants.push(child);
      addDescendants(child.id);
    });
  }
  
  addDescendants(parentId);
  return descendants;
}

/**
 * Check if an item can be moved to a target location
 */
export function canMoveItem(
  flatItems: FlatTreeItem[],
  draggedId: string,
  targetId: string,
  position: 'before' | 'after' | 'inside'
): TreeOperationResult {
  const draggedItem = findFlatTreeItem(flatItems, draggedId);
  const targetItem = findFlatTreeItem(flatItems, targetId);
  
  if (!draggedItem || !targetItem) {
    return { success: false, error: 'Item not found' };
  }
  
  // Can't move to itself
  if (draggedId === targetId) {
    return { success: false, error: 'Cannot move item to itself' };
  }
  
  // Can't move a parent into its own descendant
  const descendants = getDescendants(flatItems, draggedId);
  if (descendants.some(desc => desc.id === targetId)) {
    return { success: false, error: 'Cannot move item into its own descendant' };
  }
  
  // Can only move inside folders or collections
  if (position === 'inside') {
    if (targetItem.type === 'request') {
      return { success: false, error: 'Cannot move item inside a request' };
    }
  }
  
  // Requests can be moved anywhere valid
  // Folders can be moved anywhere valid  
  // Collections cannot be moved (handled at UI level)
  if (draggedItem.type === 'collection') {
    return { success: false, error: 'Cannot move collections' };
  }
  
  return { 
    success: true, 
    sourceItem: draggedItem, 
    targetParent: targetItem 
  };
}

/**
 * Calculate new sort order for an item being moved
 */
export function calculateNewSortOrder(
  flatItems: FlatTreeItem[],
  targetParentId: string,
  position: number
): number {
  const siblings = flatItems
    .filter(item => item.parentId === targetParentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  
  if (siblings.length === 0) {
    return 0;
  }
  
  if (position === 0) {
    return siblings[0].sortOrder - 1;
  }
  
  if (position >= siblings.length) {
    return siblings[siblings.length - 1].sortOrder + 1;
  }
  
  const prevItem = siblings[position - 1];
  const nextItem = siblings[position];
  
  return (prevItem.sortOrder + nextItem.sortOrder) / 2;
}

/**
 * Update sort orders after a move operation
 */
export function updateSortOrders(
  flatItems: FlatTreeItem[],
  parentId: string
): FlatTreeItem[] {
  const result = [...flatItems];
  const siblings = result
    .filter(item => item.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  
  siblings.forEach((item, index) => {
    const itemIndex = result.findIndex(i => i.id === item.id);
    if (itemIndex !== -1) {
      result[itemIndex] = { ...result[itemIndex], sortOrder: index };
    }
  });
  
  return result;
}

/**
 * Deep clone an item for duplication
 */
export function cloneTreeItem(
  item: RequestItem | FolderItem,
  namePrefix: string = 'Copy of '
): RequestItem | FolderItem {
  const generateNewId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  if (isRequestItem(item)) {
    return {
      ...item,
      id: generateNewId(),
      name: `${namePrefix}${item.name}`,
      // Deep clone the request object
      request: {
        ...item.request,
        // Clone headers, body, etc. if needed
        header: item.request.header ? [...item.request.header] : undefined,
      }
    };
  }
  
  if (isFolderItem(item)) {
    return {
      ...item,
      id: generateNewId(),
      name: `${namePrefix}${item.name}`,
      item: item.item.map(child => cloneTreeItem(child, ''))
    };
  }
  
  return item;
}