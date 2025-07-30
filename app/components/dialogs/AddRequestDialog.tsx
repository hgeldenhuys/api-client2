import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useCollectionStore } from '~/stores/collectionStore';
import { RequestItem, HttpMethod } from '~/types/postman';

interface AddRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  parentId: string | null;
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function AddRequestDialog({ open, onOpenChange, collectionId, parentId }: AddRequestDialogProps) {
  const [name, setName] = React.useState('');
  const [method, setMethod] = React.useState<HttpMethod>('GET');
  const [url, setUrl] = React.useState('');
  const { addRequest, openTab } = useCollectionStore();

  const handleCreate = () => {
    if (!name.trim()) return;

    const newRequest: RequestItem = {
      id: `request-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      request: {
        method,
        url: url.trim() || 'https://api.example.com/endpoint',
        header: []
      }
    };

    addRequest(collectionId, parentId, newRequest);
    
    // Open the new request in a tab
    openTab(`${collectionId}:${newRequest.id}`);
    
    // Reset form and close dialog
    setName('');
    setMethod('GET');
    setUrl('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Request</DialogTitle>
          <DialogDescription>
            Create a new API request
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="request-name">Request Name</Label>
            <Input
              id="request-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Get Users"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="method">Method</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as HttpMethod)}>
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">URL (optional)</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}