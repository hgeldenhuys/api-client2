import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useCollectionStore } from "~/stores/collectionStore";
import { FolderItem } from "~/types/postman";

interface AddFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  parentId: string | null;
}

export function AddFolderDialog({
  open,
  onOpenChange,
  collectionId,
  parentId,
}: AddFolderDialogProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const { addFolder, toggleFolderExpansion } = useCollectionStore();

  const handleCreate = () => {
    if (!name.trim()) return;

    const newFolder: FolderItem = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      item: [],
      description: description.trim() || undefined,
    };

    addFolder(collectionId, parentId, newFolder);

    // Expand parent folder if it exists
    if (parentId) {
      toggleFolderExpansion(collectionId, parentId);
    }

    // Reset form and close dialog
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your requests
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Authentication"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="folder-description">Description (optional)</Label>
            <Textarea
              id="folder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this folder contains..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
