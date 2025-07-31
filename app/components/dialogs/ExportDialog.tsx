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
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Download, Shield, FileJson, Globe, Code2 } from 'lucide-react';
import { PostmanExporter } from '~/services/import-export/postmanExporter';
import { OpenAPIExporter } from '~/services/import-export/openApiExporter';
import { HTTPFileExporter } from '~/services/import-export/httpFileExporter';
import { useCollectionStore } from '~/stores/collectionStore';
import type { PostmanCollection } from '~/types/postman';
import {Checkbox} from "~/components/ui/checkbox";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string;
}

export function ExportDialog({ open, onOpenChange, collectionId }: ExportDialogProps) {
  const [exporting, setExporting] = React.useState(false);
  const [exportType, setExportType] = React.useState<'single' | 'all' | 'backup'>('single');
  const [exportFormat, setExportFormat] = React.useState<'postman' | 'openapi' | 'http'>('postman');
  const [openApiVersion, setOpenApiVersion] = React.useState<'2.0' | '3.0' | '3.1'>('3.0');
  const [includeSensitive, setIncludeSensitive] = React.useState(false);
  
  const { collections } = useCollectionStore();

  // Reset export type when format changes and backup is no longer available
  React.useEffect(() => {
    if (exportFormat !== 'postman' && exportType === 'backup') {
      setExportType('single');
    }
  }, [exportFormat, exportType]);

  const handleExport = async () => {
    setExporting(true);

    try {
      switch (exportType) {
        case 'single':
          if (collectionId) {
            const collectionData = collections.get(collectionId);
            if (collectionData) {
              await exportSingleCollection(collectionData.collection);
            }
          }
          break;

        case 'all':
          await exportAllCollections();
          break;

        case 'backup':
          await PostmanExporter.exportBackup(includeSensitive);
          break;
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportSingleCollection = async (collection: PostmanCollection) => {
    switch (exportFormat) {
      case 'postman':
        await PostmanExporter.exportToFile(collection, {
          includeSensitiveData: includeSensitive,
          prettyPrint: true
        });
        break;

      case 'openapi':
        await OpenAPIExporter.exportToFile(collection, {
          version: openApiVersion,
          includeSensitiveData: includeSensitive,
          includeExamples: true,
          generateSchemas: true
        }, 'json');
        break;

      case 'http':
        await HTTPFileExporter.exportToFile(collection, {
          includeComments: true,
          includeVariables: true,
          includeMetadata: true,
          formatBody: true,
          includeRequestNames: true
        });
        break;
    }
  };

  const exportAllCollections = async () => {
    if (exportFormat === 'postman') {
      const allCollections = await PostmanExporter.exportAll({
        includeSensitiveData: includeSensitive,
        prettyPrint: true
      });
      
      const blob = new Blob([JSON.stringify(allCollections, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-collections-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Export each collection separately for other formats
      const collectionsArray = Array.from(collections.values());
      for (const collectionData of collectionsArray) {
        await exportSingleCollection(collectionData.collection);
      }
    }
  };

  const selectedCollection = collectionId ? collections.get(collectionId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Collections</DialogTitle>
          <DialogDescription>
            Choose the format and scope for exporting your collections.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Format Selection */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-3 block">Export Format</Label>
            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'postman' | 'openapi' | 'http')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select export format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postman">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    <span>Postman Collection</span>
                  </div>
                </SelectItem>
                <SelectItem value="openapi">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>OpenAPI/Swagger</span>
                  </div>
                </SelectItem>
                <SelectItem value="http">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4" />
                    <span>HTTP File</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* OpenAPI Version Selection */}
          {exportFormat === 'openapi' && (
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">OpenAPI Version</Label>
              <Select value={openApiVersion} onValueChange={(value) => setOpenApiVersion(value as '2.0' | '3.0' | '3.1')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select OpenAPI version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2.0">Swagger 2.0</SelectItem>
                  <SelectItem value="3.0">OpenAPI 3.0</SelectItem>
                  <SelectItem value="3.1">OpenAPI 3.1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Export Type Selection */}
          <div className="mb-4">
            <Label className="text-sm font-medium mb-3 block">Export Scope</Label>
          </div>
          <RadioGroup 
            value={exportType} 
            onValueChange={(value) => setExportType(value as 'single' | 'all' | 'backup')}
          >
            <div className="space-y-4">
              {selectedCollection && (
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <FileJson className="h-4 w-4" />
                      <span className="font-medium">Export Current Collection</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Export "{selectedCollection.collection.info.name}" in {exportFormat === 'postman' ? 'Postman Collection v2.1' : exportFormat === 'openapi' ? `OpenAPI ${openApiVersion}` : 'HTTP file'} format
                    </p>
                  </Label>
                </div>
              )}

              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <FileJson className="h-4 w-4" />
                    <span className="font-medium">Export All Collections</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Export all {collections.size} collections {exportFormat === 'postman' ? 'in a single file' : 'as separate files'}
                  </p>
                </Label>
              </div>

              {exportFormat === 'postman' && (
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
                  <RadioGroupItem value="backup" id="backup" />
                  <Label htmlFor="backup" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Download className="h-4 w-4" />
                      <span className="font-medium">Full Backup</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Export everything including history and settings
                    </p>
                  </Label>
                </div>
              )}
            </div>
          </RadioGroup>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-900 mb-1">
                  Sensitive Data Protection
                </h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-sensitive"
                    checked={includeSensitive}
                    onChange={(e) => setIncludeSensitive(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label 
                    htmlFor="include-sensitive" 
                    className="text-sm text-amber-800 cursor-pointer"
                  >
                    Include sensitive data (API keys, tokens, passwords)
                  </Label>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  When unchecked, sensitive values will be replaced with [REDACTED]
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}