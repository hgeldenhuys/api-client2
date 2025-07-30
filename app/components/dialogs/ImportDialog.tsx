import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Upload, FileText, Terminal } from 'lucide-react';
import { PostmanImporter } from '~/services/import-export/postmanImporter';
import { CurlParser } from '~/services/import-export/curlParser';
import { useCollectionStore } from '~/stores/collectionStore';
import type { PostmanCollection } from '~/types/postman';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [jsonInput, setJsonInput] = React.useState('');
  const [curlInput, setCurlInput] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const { addCollection, addRequest, collections } = useCollectionStore();

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const result = await PostmanImporter.importFromFile(file);
      
      if (result.success && result.collection) {
        await addCollection(result.collection);
        onOpenChange(false);
      } else {
        setError(result.error || 'Failed to import collection');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setImporting(false);
    }
  };

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) {
      setError('Please paste a valid Postman collection JSON');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const result = await PostmanImporter.import(jsonInput);
      
      if (result.success && result.collection) {
        await addCollection(result.collection);
        onOpenChange(false);
        setJsonInput('');
      } else {
        setError(result.error || 'Failed to import collection');
      }
    } catch (err) {
      setError('Invalid JSON format');
    } finally {
      setImporting(false);
    }
  };

  const handleCurlImport = async () => {
    if (!curlInput.trim()) {
      setError('Please paste a valid cURL command');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const result = CurlParser.parse(curlInput);
      
      if (result.success && result.request) {
        // Add to the first collection or create a new one
        const firstCollection = Array.from(collections.values())[0];
        
        if (firstCollection) {
          addRequest(firstCollection.metadata.id, null, result.request);
        } else {
          // Create a new collection for the imported request
          const newCollection: PostmanCollection = {
            info: {
              name: 'Imported Requests',
              _postman_id: crypto.randomUUID(),
              schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
              description: 'Collection for imported cURL commands'
            },
            item: [result.request]
          };
          
          await addCollection(newCollection);
        }
        
        onOpenChange(false);
        setCurlInput('');
      } else {
        setError(result.error || 'Failed to parse cURL command');
      }
    } catch (err) {
      setError('Invalid cURL command');
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      const result = await PostmanImporter.importFromFile(file);
      
      if (result.success && result.collection) {
        await addCollection(result.collection);
        onOpenChange(false);
      } else {
        setError(result.error || 'Failed to import collection');
      }
    } else {
      setError('Please drop a valid JSON file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Collection</DialogTitle>
          <DialogDescription>
            Import a Postman collection from a file, JSON, or cURL command.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" className="mt-4 flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">
              <FileText className="mr-2 h-4 w-4" />
              File
            </TabsTrigger>
            <TabsTrigger value="json">
              <FileText className="mr-2 h-4 w-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="curl">
              <Terminal className="mr-2 h-4 w-4" />
              cURL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                Postman Collection v2.1 JSON files only
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>
          </TabsContent>

          <TabsContent value="json" className="mt-4 flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex-1 flex flex-col">
                <Label htmlFor="json-input">Paste Postman Collection JSON</Label>
                <Textarea
                  id="json-input"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"info": {"name": "My Collection"}, "item": [...] }'
                  className="flex-1 min-h-[200px] max-h-[300px] font-mono text-sm resize-none"
                />
              </div>
              <Button 
                onClick={handleJsonImport} 
                disabled={importing || !jsonInput.trim()}
                className="w-full"
              >
                Import Collection
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="curl" className="mt-4 flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex-1 flex flex-col">
                <Label htmlFor="curl-input">Paste cURL Command</Label>
                <Textarea
                  id="curl-input"
                  value={curlInput}
                  onChange={(e) => setCurlInput(e.target.value)}
                  placeholder="curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{...}'"
                  className="flex-1 min-h-[200px] max-h-[300px] font-mono text-sm resize-none"
                />
              </div>
              <Button 
                onClick={handleCurlImport} 
                disabled={importing || !curlInput.trim()}
                className="w-full"
              >
                Import as Request
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}