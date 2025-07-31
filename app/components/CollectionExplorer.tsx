import React from 'react';
import { useCollectionStore } from '~/stores/collectionStore';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  type UniqueIdentifier
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { 
  Plus, 
  Search, 
  FolderPlus,
  MoreVertical,
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  Edit2,
  Trash2
} from 'lucide-react';
import { UI, METHOD_COLORS } from '~/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { PostmanCollection, RequestItem, FolderItem, isRequestItem, isFolderItem } from '~/types/postman';
import { ImportDialog } from '~/components/dialogs/ImportDialog';
import { ExportDialog } from '~/components/dialogs/ExportDialog';
import { NewCollectionDialog } from '~/components/dialogs/NewCollectionDialog';
import { AddRequestDialog } from '~/components/dialogs/AddRequestDialog';
import { AddFolderDialog } from '~/components/dialogs/AddFolderDialog';
import { DeleteConfirmDialog } from '~/components/dialogs/DeleteConfirmDialog';
import { RenameDialog } from '~/components/dialogs/RenameDialog';
import { DraggableTreeItem } from '~/components/DraggableTreeItem';
import { flattenTree } from '~/utils/treeUtils';

// Helper function to check if an item matches search query
function matchesSearch(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.toLowerCase());
}

// Helper function to filter items recursively
function filterItems(
  items: (RequestItem | FolderItem)[],
  query: string
): (RequestItem | FolderItem)[] {
  if (!query) return items;
  
  return items.reduce<(RequestItem | FolderItem)[]>((filtered, item) => {
    const itemMatches = matchesSearch(item.name, query);
    
    if (isFolderItem(item)) {
      const filteredChildren = filterItems(item.item, query);
      if (itemMatches || filteredChildren.length > 0) {
        filtered.push({
          ...item,
          item: filteredChildren
        });
      }
    } else if (itemMatches) {
      filtered.push(item);
    }
    
    return filtered;
  }, []);
}

function getMethodColorClasses(method: string): string {
  const colors = METHOD_COLORS[method as keyof typeof METHOD_COLORS];
  return colors ? `${colors.text} ${colors.bg}` : '';
}

export function CollectionExplorer() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportCollectionId, setExportCollectionId] = React.useState<string | undefined>();
  const [newCollectionDialogOpen, setNewCollectionDialogOpen] = React.useState(false);
  const [addRequestDialogOpen, setAddRequestDialogOpen] = React.useState(false);
  const [addFolderDialogOpen, setAddFolderDialogOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false);
  const [dialogContext, setDialogContext] = React.useState<{
    collectionId?: string;
    parentId?: string | null;
    deleteTarget?: { type: 'collection' | 'folder' | 'request'; id: string; name: string };
    renameTarget?: { type: 'collection' | 'folder' | 'request'; id: string; name: string };
  }>({});
  
  // Drag and drop state
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const { 
    collections, 
    activeCollectionId, 
    activeRequestId,
    setActiveCollection,
    setActiveRequest,
    openTab,
    toggleFolderExpansion,
    deleteCollection,
    deleteFolder,
    deleteRequest,
    renameRequest,
    moveItem,
    duplicateItem,
    copyToClipboard,
    pasteFromClipboard
  } = useCollectionStore();
  
  const toggleFolder = (collectionId: string, folderId: string) => {
    toggleFolderExpansion(collectionId, folderId);
  };
  
  const handleRequestClick = (collectionId: string, requestId: string) => {
    setActiveCollection(collectionId);
    setActiveRequest(requestId);
    openTab(`${collectionId}:${requestId}`);
  };
  
  const handleDeleteConfirm = () => {
    if (!dialogContext.deleteTarget) return;
    
    const { type, id } = dialogContext.deleteTarget;
    
    if (type === 'collection') {
      deleteCollection(id);
    } else if (type === 'folder' && dialogContext.collectionId) {
      deleteFolder(dialogContext.collectionId, id);
    } else if (type === 'request' && dialogContext.collectionId) {
      deleteRequest(dialogContext.collectionId, id);
    }
    
    setDialogContext({});
  };
  
  const handleRenameConfirm = (newName: string) => {
    if (!dialogContext.renameTarget || !dialogContext.collectionId) return;
    
    const { type, id } = dialogContext.renameTarget;
    
    if (type === 'request') {
      renameRequest(dialogContext.collectionId, id, newName);
    }
    // TODO: Add rename support for collections and folders when needed
    
    setDialogContext({});
  };
  
  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setIsDragging(true);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    
    setActiveId(null);
    setIsDragging(false);
    
    if (!over || active.id === over.id) {
      return;
    }
    
    // Extract collection ID and item ID from the drag ID
    // Format: collectionId:itemId
    const [dragCollectionId, dragItemId] = String(active.id).split(':');
    
    // Extract collection ID, item ID, and position from the drop zone ID
    // Format: collectionId:itemId:position or collectionId:itemId (for backwards compatibility)
    const overIdParts = String(over.id).split(':');
    let dropCollectionId: string, dropItemId: string, position: 'before' | 'after' | 'inside';
    
    
    if (overIdParts.length >= 3) {
      // New format with position: collectionId:itemId:position
      [dropCollectionId, dropItemId, position] = overIdParts as [string, string, 'before' | 'after' | 'inside'];
    } else if (overIdParts.length === 2) {
      // Old format or item itself: collectionId:itemId
      [dropCollectionId, dropItemId] = overIdParts;
      
      // Find the target item to determine default position
      const collection = collections.get(dropCollectionId);
      if (!collection) {
        return;
      }
      
      const findItemInCollection = (items: (RequestItem | FolderItem)[], targetId: string): RequestItem | FolderItem | null => {
        for (const item of items) {
          if (item.id === targetId) return item;
          if (isFolderItem(item)) {
            const found = findItemInCollection(item.item, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      
      const targetItem = findItemInCollection(collection.collection.item, dropItemId);
      if (!targetItem) {
        return;
      }
      
      // Default position based on item type
      position = isFolderItem(targetItem) ? 'inside' : 'after';
    } else {
      return;
    }
    
    if (!dragCollectionId || !dragItemId || !dropCollectionId || !dropItemId) {
      return;
    }
    
    // For now, only support drag and drop within the same collection  
    if (dragCollectionId !== dropCollectionId) {
      return;
    }
    
    
    // Try to move the item
    const success = moveItem(dragCollectionId, dragItemId, dropItemId, position);
    
  };
  
  const handleDragOver = (event: DragOverEvent) => {
    // Optional: Handle drag over events for visual feedback
  };
  
  const renderItem = (
    item: RequestItem | FolderItem, 
    collectionId: string,
    depth: number = 0
  ): React.ReactNode => {
    const itemId = item.id || '';
    const collection = collections.get(collectionId);
    const expandedFolders = collection?.metadata.expandedFolders || [];
    const isExpanded = expandedFolders.includes(itemId);
    const isActive = activeRequestId === itemId;
    
    return (
      <DraggableTreeItem
        key={itemId}
        item={item}
        collectionId={collectionId}
        depth={depth}
        isExpanded={isExpanded}
        isActive={isActive}
        onItemClick={isRequestItem(item) ? () => handleRequestClick(collectionId, itemId) : undefined}
        onToggle={isFolderItem(item) ? () => toggleFolder(collectionId, itemId) : undefined}
        onAddRequest={() => {
          setDialogContext({ collectionId, parentId: itemId });
          setAddRequestDialogOpen(true);
        }}
        onAddFolder={() => {
          setDialogContext({ collectionId, parentId: itemId });
          setAddFolderDialogOpen(true);
        }}
        onRename={() => {
          setDialogContext({
            collectionId,
            renameTarget: { 
              type: isRequestItem(item) ? 'request' : 'folder', 
              id: itemId, 
              name: item.name 
            }
          });
          setRenameDialogOpen(true);
        }}
        onDelete={() => {
          setDialogContext({
            collectionId,
            deleteTarget: { 
              type: isRequestItem(item) ? 'request' : 'folder', 
              id: itemId, 
              name: item.name 
            }
          });
          setDeleteConfirmOpen(true);
        }}
        onDuplicate={() => {
          duplicateItem(collectionId, itemId);
        }}
        onCopy={() => {
          copyToClipboard(collectionId, itemId);
        }}
        onCut={() => {
          // TODO: Implement cut functionality
          copyToClipboard(collectionId, itemId);
        }}
      >
        {isFolderItem(item) && isExpanded && (
          <>
            {item.item.map(subItem => renderItem(subItem, collectionId, depth + 1))}
          </>
        )}
      </DraggableTreeItem>
    );
  };
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
    >
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
        <div className="relative mb-3">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="space-y-2">
          <Button size="sm" className="w-full" onClick={() => setNewCollectionDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Collection
          </Button>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1"
              onClick={() => {
                setExportCollectionId(undefined); // Export all collections
                setExportDialogOpen(true);
              }}
              disabled={collections.size === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {collections.size === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No collections yet</p>
            <p className="text-xs mt-1">Create or import a collection to get started</p>
          </div>
        ) : (
          Array.from(collections.entries())
            .filter(([_, { collection }]) => 
              !searchQuery || matchesSearch(collection.info.name, searchQuery) ||
              filterItems(collection.item, searchQuery).length > 0
            )
            .map(([id, { collection }]) => {
              const filteredItems = filterItems(collection.item, searchQuery);
              // Create flat list of all sortable IDs for this collection
              const expandedFolders = collections.get(id)?.metadata.expandedFolders || [];
              const flatItems = flattenTree(
                filteredItems,
                id,
                collection.info.name,
                expandedFolders
              );
              const sortableIds = flatItems.map(item => `${id}:${item.id}`);
              
              return (
                <div key={id} className="mb-4">
                  <div 
                    role="button"
                    tabIndex={0}
                    className={`
                      flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer
                      hover:bg-accent font-medium
                      ${activeCollectionId === id ? 'bg-accent' : ''}
                    `}
                    onClick={() => setActiveCollection(id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveCollection(id);
                      }
                    }}
                  >
                    <Folder className="h-4 w-4" />
                    <span className="text-sm flex-1 truncate">{collection.info.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setDialogContext({ collectionId: id, parentId: null });
                          setAddRequestDialogOpen(true);
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Request
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setDialogContext({ collectionId: id, parentId: null });
                          setAddFolderDialogOpen(true);
                        }}>
                          <FolderPlus className="h-4 w-4 mr-2" />
                          Add Folder
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          setExportCollectionId(id);
                          setExportDialogOpen(true);
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setDialogContext({
                              deleteTarget: { type: 'collection', id, name: collection.info.name }
                            });
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          Delete Collection
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <SortableContext 
                    items={sortableIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="ml-2">
                      {filteredItems.map(item => renderItem(item, id))}
                    </div>
                  </SortableContext>
                </div>
              );
            })
        )}
      </div>
      
      <ImportDialog 
        open={importDialogOpen} 
        onOpenChange={setImportDialogOpen} 
      />
      
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        collectionId={exportCollectionId}
      />
      
      <NewCollectionDialog
        open={newCollectionDialogOpen}
        onOpenChange={setNewCollectionDialogOpen}
      />
      
      <AddRequestDialog
        open={addRequestDialogOpen}
        onOpenChange={setAddRequestDialogOpen}
        collectionId={dialogContext.collectionId || ''}
        parentId={dialogContext.parentId || null}
      />
      
      <AddFolderDialog
        open={addFolderDialogOpen}
        onOpenChange={setAddFolderDialogOpen}
        collectionId={dialogContext.collectionId || ''}
        parentId={dialogContext.parentId || null}
      />
      
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${dialogContext.deleteTarget?.type || 'item'}`}
        description={`Are you sure you want to delete "${dialogContext.deleteTarget?.name || 'this item'}"? This action cannot be undone.`}
      />
      
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        onConfirm={handleRenameConfirm}
        title={`Rename ${dialogContext.renameTarget?.type || 'item'}`}
        currentName={dialogContext.renameTarget?.name || ''}
        type={dialogContext.renameTarget?.type || 'request'}
      />
      </div>
      
      <DragOverlay>
        {activeId ? (
          <div className="bg-accent border border-border rounded-md px-2 py-1 shadow-lg">
            <span className="text-sm">Moving item...</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}