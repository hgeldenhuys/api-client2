import React from 'react';
import { useCollectionStore } from '~/stores/collectionStore';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
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
    renameRequest
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
    
    if (isRequestItem(item)) {
      return (
        <div
          key={itemId}
          role="button"
          tabIndex={0}
          className={`
            flex items-center gap-2 px-2 py-1.5 cursor-pointer
            hover:bg-accent rounded-sm group
            ${isActive ? 'bg-accent' : ''}
          `}
          style={{ paddingLeft: `${(depth * UI.INDENT_SIZE) + 8}px` }}
          onClick={() => handleRequestClick(collectionId, itemId)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleRequestClick(collectionId, itemId);
            }
          }}
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{item.name}</span>
          <span className={`
            text-xs font-medium px-1.5 py-0.5 rounded
            ${getMethodColorClasses(item.request.method)}
          `}>
            {item.request.method}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setDialogContext({
                  collectionId,
                  renameTarget: { type: 'request', id: itemId, name: item.name }
                });
                setRenameDialogOpen(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => {
                  setDialogContext({
                    collectionId,
                    deleteTarget: { type: 'request', id: itemId, name: item.name }
                  });
                  setDeleteConfirmOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }
    
    if (isFolderItem(item)) {
      return (
        <div key={itemId}>
          <div
            role="button"
            tabIndex={0}
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm group"
            style={{ paddingLeft: `${(depth * UI.INDENT_SIZE) + 8}px` }}
            onClick={() => toggleFolder(collectionId, itemId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFolder(collectionId, itemId);
              }
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1 truncate">{item.name}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setDialogContext({ collectionId, parentId: itemId });
                  setAddRequestDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Request
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setDialogContext({ collectionId, parentId: itemId });
                  setAddFolderDialogOpen(true);
                }}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => {
                    setDialogContext({
                      collectionId,
                      deleteTarget: { type: 'folder', id: itemId, name: item.name }
                    });
                    setDeleteConfirmOpen(true);
                  }}
                >
                  Delete Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isExpanded && (
            <div>
              {item.item.map(subItem => renderItem(subItem, collectionId, depth + 1))}
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };
  
  return (
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
                  <div className="ml-2">
                    {filteredItems.map(item => renderItem(item, id))}
                  </div>
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
  );
}