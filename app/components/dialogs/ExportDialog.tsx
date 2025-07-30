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
import { Download, Shield, FileJson } from 'lucide-react';
import { PostmanExporter } from '~/services/import-export/postmanExporter';
import { useCollectionStore } from '~/stores/collectionStore';
import type { PostmanCollection } from '~/types/postman';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string;
}

export function ExportDialog({ open, onOpenChange, collectionId }: ExportDialogProps) {
  const [exporting, setExporting] = React.useState(false);
  const [exportType, setExportType] = React.useState<'single' | 'all' | 'backup'>('single');
  const [includeSensitive, setIncludeSensitive] = React.useState(false);
  
  const { collections } = useCollectionStore();

  const handleExport = async () => {
    setExporting(true);

    try {
      switch (exportType) {
        case 'single':
          if (collectionId) {
            const collectionData = collections.get(collectionId);
            if (collectionData) {
              await PostmanExporter.exportToFile(collectionData.collection, {
                includeSensitiveData: includeSensitive,
                prettyPrint: true
              });
            }
          }
          break;

        case 'all':
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

  const selectedCollection = collectionId ? collections.get(collectionId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Collections</DialogTitle>
          <DialogDescription>
            Choose how you want to export your collections.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
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
                      Export "{selectedCollection.collection.info.name}" as Postman Collection v2.1
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
                    Export all {collections.size} collections in a single file
                  </p>
                </Label>
              </div>

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
                  <input
                    type="checkbox"
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