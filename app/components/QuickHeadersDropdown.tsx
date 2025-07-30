import React from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Zap, Search } from 'lucide-react';
import { QUICK_HEADERS, searchQuickHeaders, type QuickHeaderOption } from '~/utils/quickHeaders';
import { createUniversalParameter } from '~/utils/parameterLocations';
import type { UniversalParameter } from '~/types/postman';

interface QuickHeadersDropdownProps {
  readonly onAddHeader: (header: UniversalParameter) => void;
  readonly className?: string;
}

export function QuickHeadersDropdown({ onAddHeader, className }: QuickHeadersDropdownProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  
  const filteredHeaders = React.useMemo(() => {
    if (!searchQuery.trim()) {
      // Return all headers grouped by category
      return QUICK_HEADERS;
    }
    
    // Return filtered headers as a single ungrouped list
    const results = searchQuickHeaders(searchQuery);
    return [{
      name: 'Search Results',
      description: `${results.length} headers found`,
      headers: results
    }];
  }, [searchQuery]);

  const handleSelectHeader = (headerOption: QuickHeaderOption) => {
    const universalParam = createUniversalParameter(
      headerOption.key,
      headerOption.value,
      'header'
    );
    
    onAddHeader(universalParam);
    setIsOpen(false);
    setSearchQuery(''); // Clear search after selection
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={className}
          title="Add quick header"
        >
          <Zap className="h-4 w-4 mr-1" />
          Quick Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 max-h-96 overflow-y-auto" 
        align="start"
        side="bottom"
      >
        {/* Search input */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search headers..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 h-8"
              autoFocus
            />
          </div>
        </div>

        {/* Headers list */}
        <div className="max-h-80 overflow-y-auto">
          {filteredHeaders.map((category, categoryIndex) => (
            <div key={category.name}>
              {/* Category label */}
              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>{category.name}</span>
                  <span className="text-xs opacity-60">
                    {category.headers.length} {category.headers.length === 1 ? 'header' : 'headers'}
                  </span>
                </div>
              </DropdownMenuLabel>
              
              {/* Category headers */}
              {category.headers.map((header, headerIndex) => (
                <DropdownMenuItem
                  key={`${header.key}-${header.value}-${headerIndex}`}
                  onClick={() => handleSelectHeader(header)}
                  className="px-2 py-2 cursor-pointer flex flex-col items-start gap-1"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-sm">{header.key}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      header
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate w-full">
                    <span className="font-mono bg-muted px-1 py-0.5 rounded mr-2">
                      {header.value.length > 30 ? `${header.value.substring(0, 30)}...` : header.value}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {header.description}
                  </div>
                </DropdownMenuItem>
              ))}
              
              {/* Separator between categories (except last) */}
              {categoryIndex < filteredHeaders.length - 1 && (
                <DropdownMenuSeparator className="my-1" />
              )}
            </div>
          ))}
          
          {/* No results message */}
          {filteredHeaders.length === 0 || filteredHeaders.every(cat => cat.headers.length === 0) && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No headers found for "{searchQuery}"
            </div>
          )}
        </div>

        {/* Footer info */}
        <DropdownMenuSeparator />
        <div className="p-2 text-xs text-muted-foreground">
          💡 Tip: Use <code className="bg-muted px-1 rounded">{'{{variable}}'}</code> syntax for dynamic values
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}