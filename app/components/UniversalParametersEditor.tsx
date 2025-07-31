import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Filter,
  MoreHorizontal,
  Copy,
  Download,
} from "lucide-react";
import { UniversalParameter, ParameterLocation } from "~/types/postman";
import {
  PARAMETER_LOCATIONS,
  validateParameter,
  createUniversalParameter,
  groupParametersByLocation,
  suggestParameterLocation,
} from "~/utils/parameterLocations";
import {
  getLocationChangeImpact,
  validateLocationChange,
} from "~/utils/parameterLocationSync";
import { useEnvironmentStore } from "~/stores/environmentStore";
import { cn } from "~/lib/utils";
import { UrlVariableInput } from "~/components/UrlVariableInput";
import { AddVariableDialog } from "~/components/AddVariableDialog";
import { useVariableContext } from "~/hooks/useVariableContext";
import { Checkbox } from "~/components/ui/checkbox";

interface UniversalParametersEditorProps {
  parameters: UniversalParameter[];
  onChange: (parameters: UniversalParameter[]) => void;
  className?: string;
}

export const UniversalParametersEditor = React.memo(
  function UniversalParametersEditor({
    parameters,
    onChange,
    className,
  }: UniversalParametersEditorProps) {
    const [selectedLocation, setSelectedLocation] = React.useState<
      ParameterLocation | "all"
    >("all");
    const [showDisabled, setShowDisabled] = React.useState(true);

    const groupedParameters = groupParametersByLocation(parameters);

    const filteredParameters =
      selectedLocation === "all"
        ? parameters
        : groupedParameters[selectedLocation];

    const displayParameters = showDisabled
      ? filteredParameters
      : filteredParameters.filter((p) => p.enabled);

    const handleParameterChange = React.useCallback(
      (id: string, updates: Partial<UniversalParameter>) => {
        const updatedParameters = parameters.map((param) =>
          param.id === id ? { ...param, ...updates } : param,
        );
        onChange(updatedParameters);
      },
      [parameters, onChange],
    );

    const handleAddParameter = React.useCallback(() => {
      const newParam = createUniversalParameter(
        "",
        "",
        selectedLocation === "all" ? "query" : selectedLocation,
      );
      onChange([...parameters, newParam]);
    }, [parameters, onChange, selectedLocation]);

    const handleRemoveParameter = React.useCallback(
      (id: string) => {
        onChange(parameters.filter((param) => param.id !== id));
      },
      [parameters, onChange],
    );

    const handleBulkLocationChange = (newLocation: ParameterLocation) => {
      const updatedParameters = parameters.map((param) => {
        if (selectedLocation === "all" || param.location === selectedLocation) {
          return { ...param, location: newLocation };
        }
        return param;
      });
      onChange(updatedParameters);
    };

    const handleBulkToggle = (enabled: boolean) => {
      const updatedParameters = parameters.map((param) => {
        if (selectedLocation === "all" || param.location === selectedLocation) {
          return { ...param, enabled };
        }
        return param;
      });
      onChange(updatedParameters);
    };

    const getLocationCounts = () => {
      const counts: Record<string, number> = { all: parameters.length };
      Object.keys(PARAMETER_LOCATIONS).forEach((location) => {
        counts[location] =
          groupedParameters[location as ParameterLocation].length;
      });
      return counts;
    };

    const locationCounts = getLocationCounts();

    return (
      <div className={cn("h-full flex flex-col", className)}>
        {/* Header with filters and bulk actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 border-b">
          <div className="flex items-center gap-3 flex-wrap">
            <Select
              value={selectedLocation}
              onValueChange={(value) =>
                setSelectedLocation(value as ParameterLocation | "all")
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Parameters ({locationCounts.all})
                </SelectItem>
                {Object.values(PARAMETER_LOCATIONS).map((locationInfo) => (
                  <SelectItem
                    key={locationInfo.location}
                    value={locationInfo.location}
                  >
                    <span className="flex items-center gap-2">
                      <span>{locationInfo.icon}</span>
                      {locationInfo.label} (
                      {locationCounts[locationInfo.location]})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setShowDisabled(!showDisabled)}
            >
              {showDisabled ? (
                <Eye className="h-4 w-4 mr-1" />
              ) : (
                <EyeOff className="h-4 w-4 mr-1" />
              )}
              {showDisabled ? "Hide Disabled" : "Show Disabled"}
            </Button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Select onValueChange={handleBulkLocationChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Move to..." />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PARAMETER_LOCATIONS).map((locationInfo) => (
                  <SelectItem
                    key={locationInfo.location}
                    value={locationInfo.location}
                  >
                    <span className="flex items-center gap-2">
                      <span>{locationInfo.icon}</span>
                      {locationInfo.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => handleBulkToggle(true)}
            >
              Enable All
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => handleBulkToggle(false)}
            >
              Disable All
            </Button>

            <Button
              onClick={handleAddParameter}
              size="sm"
              className="whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Parameter
            </Button>
          </div>
        </div>

        {/* Parameters table */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="table" className="h-full">
            <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
              <TabsTrigger
                value="table"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                Parameters Table
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                Request Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="table"
              className="h-[calc(100%-40px)] overflow-y-auto p-0"
            >
              <div className="min-w-full">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 border-b text-sm font-medium">
                  <div className="col-span-1">✓</div>
                  <div className="col-span-3">Parameter Name</div>
                  <div className="col-span-3">Value</div>
                  <div className="col-span-2">Type & Location</div>
                  <div className="col-span-2">Description</div>
                  <div className="col-span-1">Actions</div>
                </div>

                {/* Parameters rows - grouped by location when showing all */}
                <div className="divide-y">
                  {displayParameters.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <div className="mb-2">No parameters found</div>
                      <Button
                        onClick={handleAddParameter}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add your first parameter
                      </Button>
                    </div>
                  ) : selectedLocation === "all" ? (
                    // Group by location when showing all parameters
                    Object.entries(groupedParameters).map(
                      ([location, params]) =>
                        params.filter((p) => (!showDisabled ? p.enabled : true))
                          .length > 0 && (
                          <div key={location}>
                            {/* Location group header */}
                            <div className="bg-muted/30 px-3 py-2 border-b">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <span>
                                  {
                                    PARAMETER_LOCATIONS[
                                      location as ParameterLocation
                                    ].icon
                                  }
                                </span>
                                <span>
                                  {
                                    PARAMETER_LOCATIONS[
                                      location as ParameterLocation
                                    ].label
                                  }
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {
                                    params.filter((p) =>
                                      !showDisabled ? p.enabled : true,
                                    ).length
                                  }
                                </Badge>
                              </div>
                            </div>
                            {/* Parameters in this location */}
                            {params
                              .filter((p) => (!showDisabled ? p.enabled : true))
                              .map((param) => (
                                <ParameterRow
                                  key={param.id}
                                  parameter={param}
                                  onChange={(updates) =>
                                    handleParameterChange(param.id, updates)
                                  }
                                  onRemove={() =>
                                    handleRemoveParameter(param.id)
                                  }
                                />
                              ))}
                          </div>
                        ),
                    )
                  ) : (
                    // Show flat list when filtering by specific location
                    displayParameters.map((param) => (
                      <ParameterRow
                        key={param.id}
                        parameter={param}
                        onChange={(updates) =>
                          handleParameterChange(param.id, updates)
                        }
                        onRemove={() => handleRemoveParameter(param.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="preview"
              className="h-[calc(100%-40px)] overflow-y-auto p-4"
            >
              <RequestPreview parameters={parameters} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  },
);

interface ParameterRowProps {
  parameter: UniversalParameter;
  onChange: (updates: Partial<UniversalParameter>) => void;
  onRemove: () => void;
}

const ParameterRow = React.memo(function ParameterRow({
  parameter,
  onChange,
  onRemove,
}: ParameterRowProps) {
  const { variables } = useVariableContext();
  const locationInfo = PARAMETER_LOCATIONS[parameter.location];
  const validation = validateParameter(parameter);
  const [showFileUpload, setShowFileUpload] = React.useState(false);
  const [showAddVariableDialog, setShowAddVariableDialog] = useState(false);
  const [variableToAdd, setVariableToAdd] = useState("");

  // Memoize change handlers to prevent re-renders
  const handleValueChange = React.useCallback(
    (value: string) => {
      onChange({ value });
    },
    [onChange],
  );

  const handleLocationChange = React.useCallback(
    (value: string) => {
      const newLocation = value as ParameterLocation;

      // Validate the location change
      const validation = validateLocationChange(parameter, newLocation);
      if (!validation.valid) {
        // Could show a toast or error message here
        console.warn(
          `Cannot move parameter to ${newLocation}: ${validation.reason}`,
        );
        return;
      }

      // Get impact information (useful for debugging or future UI enhancements)
      const impact = getLocationChangeImpact(
        [parameter],
        parameter.id,
        newLocation,
      );
      if (impact.willRemoveFromUrl) {
        console.log(`Parameter "${parameter.key}" will be removed from URL`);
      }
      if (impact.willAddToUrl) {
        console.log(`Parameter "${parameter.key}" will be added to URL`);
      }

      onChange({ location: newLocation });
    },
    [parameter, onChange],
  );

  const handleEnabledChange = React.useCallback(
    (checked: boolean) => {
      onChange({ enabled: checked });
    },
    [onChange],
  );

  const handleDescriptionChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ description: e.target.value });
    },
    [onChange],
  );

  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-2 p-3 hover:bg-muted/50 transition-colors",
        !parameter.enabled && "opacity-60",
      )}
    >
      {/* Enabled checkbox */}
      <div className="col-span-1 flex items-center">
        <Checkbox
          checked={parameter.enabled}
          onCheckedChange={handleEnabledChange}
          className="rounded"
        />
      </div>

      {/* Key */}
      <div className="col-span-3">
        <UrlVariableInput
          value={parameter.key}
          vars={variables}
          onChange={(value) => {
            onChange({
              key: value,
              // Auto-suggest location if key changes and current location is default
              ...(parameter.key === "" &&
                value !== "" && {
                  location: suggestParameterLocation(value),
                }),
            });
          }}
          onAddVariable={(varName) => {
            setVariableToAdd(varName);
            setShowAddVariableDialog(true);
          }}
          placeholder="Parameter key"
          className={cn("h-8", !validation.valid && "border-red-500")}
          showPreviewButton={false}
        />
      </div>

      {/* Value */}
      <div className="col-span-3">
        {parameter.type === "file" && locationInfo.supportsFiles ? (
          <div className="flex items-center gap-1">
            <Input
              value={parameter.src || ""}
              onChange={(e) => onChange({ src: e.target.value })}
              placeholder="File path"
              className="h-8 flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFileUpload(!showFileUpload)}
            >
              <Upload className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <UrlVariableInput
            value={parameter.value}
            vars={variables}
            onChange={handleValueChange}
            onAddVariable={(varName) => {
              setVariableToAdd(varName);
              setShowAddVariableDialog(true);
            }}
            placeholder="Parameter value"
            className="h-8"
            showPreviewButton={false}
          />
        )}
      </div>

      {/* Type & Location */}
      <div className="col-span-2">
        <div className="space-y-1">
          <Select
            value={parameter.location}
            onValueChange={handleLocationChange}
          >
            <SelectTrigger className="h-8">
              <SelectValue>
                <span className="flex items-center gap-1">
                  <span>{locationInfo.icon}</span>
                  <span className="text-xs">{locationInfo.label}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(PARAMETER_LOCATIONS).map((loc) => (
                <SelectItem key={loc.location} value={loc.location}>
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2">
                      <span>{loc.icon}</span>
                      {loc.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {loc.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {parameter.type === "file" && (
            <Badge variant="outline" className="text-xs">
              File
            </Badge>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="col-span-2">
        <Input
          value={parameter.description || ""}
          onChange={handleDescriptionChange}
          placeholder="Optional description"
        />
      </div>

      {/* Actions */}
      <div className="col-span-1 flex items-center justify-end">
        {locationInfo.supportsFiles && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onChange({
                type: parameter.type === "file" ? "text" : "file",
              })
            }
            className="h-6 w-6 p-0 mr-1"
          >
            <Upload
              className={cn(
                "h-3 w-3",
                parameter.type === "file" && "text-primary",
              )}
            />
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
        >
          <Trash2 />
        </Button>
      </div>

      {/* Validation errors */}
      {!validation.valid && (
        <div className="col-span-12 px-1">
          {validation.errors.map((error, index) => (
            <div key={index} className="text-xs text-red-500 mt-1">
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Add Variable Dialog */}
      <AddVariableDialog
        open={showAddVariableDialog}
        onOpenChange={setShowAddVariableDialog}
        variableName={variableToAdd}
        onSuccess={() => {
          setVariableToAdd("");
        }}
      />
    </div>
  );
});

interface RequestPreviewProps {
  parameters: UniversalParameter[];
}

function RequestPreview({ parameters }: RequestPreviewProps) {
  const grouped = groupParametersByLocation(parameters);
  const enabledParams = parameters.filter((p) => p.enabled);
  const { replaceVariables } = useEnvironmentStore();

  return (
    <div className="space-y-6">
      {/* Query Parameters Preview */}
      {grouped.query.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            🔗 Query Parameters
          </h3>
          <div className="bg-muted/50 p-3 rounded-md font-mono text-sm">
            ?
            {grouped.query
              .filter((p) => p.enabled)
              .map(
                (p) =>
                  `${encodeURIComponent(p.key)}=${encodeURIComponent(replaceVariables(p.value))}`,
              )
              .join("&")}
          </div>
        </div>
      )}

      {/* Headers Preview */}
      {grouped.header.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            📋 Headers
          </h3>
          <div className="bg-muted/50 p-3 rounded-md font-mono text-sm space-y-1">
            {grouped.header
              .filter((p) => p.enabled)
              .map((p) => (
                <div key={p.id}>
                  {p.key}: {replaceVariables(p.value)}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Form Data Preview */}
      {grouped["form-data"].length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            📄 Form Data (multipart/form-data)
          </h3>
          <div className="bg-muted/50 p-3 rounded-md font-mono text-sm space-y-1">
            {grouped["form-data"]
              .filter((p) => p.enabled)
              .map((p) => (
                <div key={p.id}>
                  {p.key}:{" "}
                  {p.type === "file"
                    ? `[FILE: ${p.src || "No file selected"}]`
                    : replaceVariables(p.value)}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* URL Encoded Preview */}
      {grouped.urlencoded.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            🔒 URL Encoded Body
          </h3>
          <div className="bg-muted/50 p-3 rounded-md font-mono text-sm">
            {grouped.urlencoded
              .filter((p) => p.enabled)
              .map(
                (p) =>
                  `${encodeURIComponent(p.key)}=${encodeURIComponent(replaceVariables(p.value))}`,
              )
              .join("&")}
          </div>
        </div>
      )}

      {/* Path Variables Preview */}
      {grouped.path.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            🛤️ Path Variables
          </h3>
          <div className="bg-muted/50 p-3 rounded-md font-mono text-sm space-y-1">
            {grouped.path
              .filter((p) => p.enabled)
              .map((p) => (
                <div key={p.id}>
                  {`{${p.key}}`} → {replaceVariables(p.value)}
                </div>
              ))}
          </div>
        </div>
      )}

      {enabledParams.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No enabled parameters to preview
        </div>
      )}
    </div>
  );
}
