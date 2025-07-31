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
import { Upload, FileText, Terminal, Globe, Code2 } from 'lucide-react';
import { PostmanImporter } from '~/services/import-export/postmanImporter';
import { CurlParser } from '~/services/import-export/curlParser';
import { OpenAPIImporter } from '~/services/import-export/openApiImporter';
import { HTTPFileImporter } from '~/services/import-export/httpFileImporter';
import { useCollectionStore } from '~/stores/collectionStore';
import type { PostmanCollection } from '~/types/postman';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HTTP_FILE_PLACEHOLDER = `### Get Users
GET {{baseUrl}}/users
Authorization: Bearer {{token}}

### Create User
POST {{baseUrl}}/users
Content-Type: application/json

{
  "name": "John Doe"
}`;

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [jsonInput, setJsonInput] = React.useState('');
  const [curlInput, setCurlInput] = React.useState('');
  const [openApiInput, setOpenApiInput] = React.useState('');
  const [httpFileInput, setHttpFileInput] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const { addCollection, addRequest, collections } = useCollectionStore();

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      let result: { success: boolean; collection?: PostmanCollection; error?: string; warnings?: string[] };

      // Detect file type and use appropriate importer
      if (file.name.endsWith('.http') || file.name.endsWith('.rest')) {
        // HTTP file
        const httpResult = await HTTPFileImporter.importFromFile(file);
        if (httpResult.success && httpResult.file) {
          const collection = HTTPFileImporter.convertToPostmanCollection(httpResult.file);
          result = { success: true, collection, warnings: httpResult.warnings?.map(w => w.message) };
        } else {
          result = { success: false, error: httpResult.errors?.[0]?.message || 'Failed to import HTTP file' };
        }
      } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml') || 
                 (file.name.endsWith('.json') && await detectOpenAPIFile(file))) {
        // OpenAPI/Swagger file
        result = await OpenAPIImporter.importFromFile(file);
      } else {
        // Default to Postman format
        result = await PostmanImporter.importFromFile(file);
      }
      
      if (result.success && result.collection) {
        await addCollection(result.collection);
        onOpenChange(false);
        
        // Show warnings if any
        if (result.warnings && result.warnings.length > 0) {
          console.warn('Import warnings:', result.warnings);
        }
      } else {
        setError(result.error || 'Failed to import file');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setImporting(false);
    }
  };

  // Helper to detect OpenAPI files
  const detectOpenAPIFile = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      return !!(data.openapi || data.swagger || data.paths);
    } catch {
      return false;
    }
  };

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) {
      setError('Please paste a valid JSON');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      // Try to detect format from JSON content
      const data = JSON.parse(jsonInput);
      let result: { success: boolean; collection?: PostmanCollection; error?: string; warnings?: string[] };

      if (data.openapi || data.swagger || data.paths) {
        // OpenAPI/Swagger format
        result = await OpenAPIImporter.import(jsonInput);
      } else {
        // Default to Postman format
        result = await PostmanImporter.import(jsonInput);
      }
      
      if (result.success && result.collection) {
        await addCollection(result.collection);
        onOpenChange(false);
        setJsonInput('');
        
        if (result.warnings && result.warnings.length > 0) {
          console.warn('Import warnings:', result.warnings);
        }
      } else {
        setError(result.error || 'Failed to import');
      }
    } catch (err) {
      setError('Invalid JSON format');
    } finally {
      setImporting(false);
    }
  };

  const handleOpenApiImport = async () => {
    if (!openApiInput.trim()) {
      setError('Please paste a valid OpenAPI/Swagger specification');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const result = await OpenAPIImporter.import(openApiInput);
      
      if (result.success && result.collection) {
        await addCollection(result.collection);
        onOpenChange(false);
        setOpenApiInput('');
        
        if (result.warnings && result.warnings.length > 0) {
          console.warn('Import warnings:', result.warnings);
        }
      } else {
        setError(result.error || 'Failed to import OpenAPI specification');
      }
    } catch (err) {
      setError('Invalid OpenAPI format');
    } finally {
      setImporting(false);
    }
  };

  const handleHttpFileImport = async () => {
    if (!httpFileInput.trim()) {
      setError('Please paste valid HTTP file content');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const result = HTTPFileImporter.parse(httpFileInput);
      
      if (result.success && result.file) {
        const collection = HTTPFileImporter.convertToPostmanCollection(result.file);
        await addCollection(collection);
        onOpenChange(false);
        setHttpFileInput('');
        
        if (result.warnings && result.warnings.length > 0) {
          console.warn('Import warnings:', result.warnings.map(w => w.message));
        }
      } else {
        setError(result.errors?.[0]?.message || 'Failed to import HTTP file');
      }
    } catch (err) {
      setError('Invalid HTTP file format');
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
    if (file) {
      // Simulate file input change event
      const fakeEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      await handleFileImport(fakeEvent);
    } else {
      setError('Please drop a valid file');
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
            Import from Postman collections, OpenAPI/Swagger specs, HTTP files, or cURL commands.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" className="mt-4 flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="file">
              <Upload className="mr-1 h-3 w-3" />
              File
            </TabsTrigger>
            <TabsTrigger value="json">
              <FileText className="mr-1 h-3 w-3" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="openapi">
              <Globe className="mr-1 h-3 w-3" />
              OpenAPI
            </TabsTrigger>
            <TabsTrigger value="http">
              <Code2 className="mr-1 h-3 w-3" />
              HTTP
            </TabsTrigger>
            <TabsTrigger value="curl">
              <Terminal className="mr-1 h-3 w-3" />
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
                Supports Postman Collections, OpenAPI/Swagger (JSON/YAML), and HTTP files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml,.http,.rest,application/json,text/yaml,text/plain"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>
          </TabsContent>

          <TabsContent value="json" className="mt-4 flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex-1 flex flex-col">
                <Label htmlFor="json-input">Paste JSON (Postman Collection or OpenAPI)</Label>
                <Textarea
                  id="json-input"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"info": {"name": "My Collection"}, "item": [...] } or {"openapi": "3.0.0", ...}'
                  className="flex-1 min-h-[200px] max-h-[300px] font-mono text-sm resize-none"
                />
              </div>
              <Button 
                onClick={handleJsonImport} 
                disabled={importing || !jsonInput.trim()}
                className="w-full"
              >
                Import JSON
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="openapi" className="mt-4 flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex-1 flex flex-col">
                <Label htmlFor="openapi-input">Paste OpenAPI/Swagger Specification</Label>
                <Textarea
                  id="openapi-input"
                  value={openApiInput}
                  onChange={(e) => setOpenApiInput(e.target.value)}
                  placeholder='{"openapi": "3.0.0", "info": {...}, "paths": {...} } or swagger: "2.0"'
                  className="flex-1 min-h-[200px] max-h-[300px] font-mono text-sm resize-none"
                />
              </div>
              <Button 
                onClick={handleOpenApiImport} 
                disabled={importing || !openApiInput.trim()}
                className="w-full"
              >
                Import OpenAPI
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="http" className="mt-4 flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex-1 flex flex-col">
                <Label htmlFor="http-input">Paste HTTP File Content</Label>
                <Textarea
                  id="http-input"
                  value={httpFileInput}
                  onChange={(e) => setHttpFileInput(e.target.value)}
                  placeholder={HTTP_FILE_PLACEHOLDER}
                  className="flex-1 min-h-[200px] max-h-[300px] font-mono text-sm resize-none"
                />
              </div>
              <Button 
                onClick={handleHttpFileImport} 
                disabled={importing || !httpFileInput.trim()}
                className="w-full"
              >
                Import HTTP File
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