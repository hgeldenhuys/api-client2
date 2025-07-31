import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "~/components/ui/button";
import {
  MoreVertical,
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  Edit2,
  Trash2,
  Copy,
  Scissors,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  RequestItem,
  FolderItem,
  isRequestItem,
  isFolderItem,
} from "~/types/postman";
import { UI, METHOD_COLORS } from "~/constants";

interface DraggableTreeItemProps {
  item: RequestItem | FolderItem;
  collectionId: string;
  depth: number;
  isExpanded?: boolean;
  isActive?: boolean;
  onItemClick?: () => void;
  onToggle?: () => void;
  onAddRequest?: () => void;
  onAddFolder?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  children?: React.ReactNode;
}

function getMethodColorClasses(method: string): string {
  const colors = METHOD_COLORS[method as keyof typeof METHOD_COLORS];
  return colors ? `${colors.text} ${colors.bg}` : "";
}

export function DraggableTreeItem({
  item,
  collectionId,
  depth,
  isExpanded = false,
  isActive = false,
  onItemClick,
  onToggle,
  onAddRequest,
  onAddFolder,
  onRename,
  onDelete,
  onDuplicate,
  onCopy,
  onCut,
  children,
}: DraggableTreeItemProps) {
  const itemId = item.id || "";
  const dragId = `${collectionId}:${itemId}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dragId });

  // Create drop zones for different positions
  const beforeDropId = `${dragId}:before`;
  const afterDropId = `${dragId}:after`;
  const insideDropId = `${dragId}:inside`;

  const { setNodeRef: setBeforeDropRef, isOver: isOverBefore } = useDroppable({
    id: beforeDropId,
  });

  const { setNodeRef: setAfterDropRef, isOver: isOverAfter } = useDroppable({
    id: afterDropId,
  });

  const { setNodeRef: setInsideDropRef, isOver: isOverInside } = useDroppable({
    id: insideDropId,
    disabled: isRequestItem(item), // Requests can't have items dropped inside them
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isRequestItem(item)) {
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        {/* Before drop zone */}
        <div
          ref={setBeforeDropRef}
          className={`
            h-1 -mb-1 transition-colors
            ${isOverBefore ? "bg-primary" : "transparent"}
          `}
        />

        <div
          className={`
            flex items-center gap-2 px-2 py-1.5 cursor-pointer
            hover:bg-accent rounded-sm group relative
            ${isActive ? "bg-accent" : ""}
            ${isDragging ? "shadow-lg" : ""}
            ${isOverAfter ? "border-b-2 border-primary" : ""}
          `}
          style={{ paddingLeft: `${depth * UI.INDENT_SIZE + 8}px` }}
          onClick={onItemClick}
        >
          <div
            {...listeners}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm flex-1 truncate">{item.name}</span>
            <span
              className={`
              text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0
              ${getMethodColorClasses(item.request.method)}
            `}
            >
              {item.request.method}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCut}>
                <Scissors className="h-4 w-4 mr-2" />
                Cut
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* After drop zone */}
        <div
          ref={setAfterDropRef}
          className={`
            h-1 -mt-1 transition-colors
            ${isOverAfter ? "bg-primary" : "transparent"}
          `}
        />
      </div>
    );
  }

  if (isFolderItem(item)) {
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div>
          {/* Before drop zone */}
          <div
            ref={setBeforeDropRef}
            className={`
              h-1 -mb-1 transition-colors
              ${isOverBefore ? "bg-primary" : "transparent"}
            `}
          />

          <div
            className={`
              flex items-center gap-2 px-2 py-1.5 cursor-pointer 
              hover:bg-accent rounded-sm group relative
              ${isDragging ? "shadow-lg" : ""}
              ${isOverInside ? "bg-primary/10 border border-primary/50" : ""}
              ${isOverAfter ? "border-b-2 border-primary" : ""}
            `}
            style={{ paddingLeft: `${depth * UI.INDENT_SIZE + 8}px` }}
            onClick={onToggle}
          >
            {/* Inside drop zone for folders */}
            <div
              ref={setInsideDropRef}
              className="absolute inset-0 pointer-events-none"
            />

            <div
              {...listeners}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm flex-1 truncate">{item.name}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onAddRequest}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Request
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddFolder}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onRename}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCut}>
                  <Scissors className="h-4 w-4 mr-2" />
                  Cut
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* After drop zone */}
          <div
            ref={setAfterDropRef}
            className={`
              h-1 -mt-1 transition-colors
              ${isOverAfter ? "bg-primary" : "transparent"}
            `}
          />

          {isExpanded && children && <div className="relative">{children}</div>}
        </div>
      </div>
    );
  }

  return null;
}
