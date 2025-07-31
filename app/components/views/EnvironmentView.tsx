import React from "react";
import { useEnvironmentStore } from "~/stores/environmentStore";
import { useCollectionStore } from "~/stores/collectionStore";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Globe,
  Search,
  Settings,
  BarChart3,
} from "lucide-react";
import { PasswordInput } from "~/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { cn } from "~/utils/cn";
import { Checkbox } from "~/components/ui/checkbox";

type TTabs = "summary" | "environments" | "globals";

interface VariableWithScope {
  key: string;
  value: string;
  scope: "collection" | "environment" | "secrets" | "globals";
  scopeName: string;
  priority: number;
  isSecret: boolean;
  enabled: boolean;
  environmentId?: string;
  index?: number; // For global variables
}

export function EnvironmentView() {
  const {
    environments,
    activeEnvironmentId,
    globalVariables,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
    addGlobalVariable,
    updateGlobalVariable,
    deleteGlobalVariable,
  } = useEnvironmentStore();

  const { activeCollectionId, collections } = useCollectionStore();

  const [selectedEnvId, setSelectedEnvId] = React.useState<string | null>(
    activeEnvironmentId,
  );
  const [showSecrets, setShowSecrets] = React.useState(false);
  const [hideTimer, setHideTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<TTabs>("summary" as TTabs);
  const [newEnvName, setNewEnvName] = React.useState("");

  // Get selected environment - handle Map access issues
  const selectedEnv = selectedEnvId
    ? environments && typeof environments.get === "function"
      ? environments.get(selectedEnvId)
      : Array.from(environments.values()).find(
          (env) => env.id === selectedEnvId,
        )
    : null;

  // State for adding variables
  const [newVarKey, setNewVarKey] = React.useState("");
  const [newVarValue, setNewVarValue] = React.useState("");
  const [newVarIsSecret, setNewVarIsSecret] = React.useState(false);

  // Variable aggregation for summary view
  const getAllVariablesWithScope =
    React.useCallback((): VariableWithScope[] => {
      const allVariables: VariableWithScope[] = [];

      // 1. Collection variables (highest priority)
      if (activeCollectionId) {
        const collection = collections.get(activeCollectionId);
        if (collection?.collection.variable) {
          for (const variable of collection.collection.variable) {
            if (!variable.disabled) {
              allVariables.push({
                key: variable.key,
                value: variable.value,
                scope: "collection",
                scopeName: collection.collection.info.name,
                priority: 1,
                isSecret: false,
                enabled: true,
              });
            }
          }
        }
      }

      // 2. Environment variables from ALL environments
      for (const env of Array.from(environments.values())) {
        // Regular environment variables
        for (const [key, value] of Object.entries(env.values || {})) {
          allVariables.push({
            key,
            value,
            scope: "environment",
            scopeName: env.name,
            priority: env.id === activeEnvironmentId ? 2 : 5, // Active env gets higher priority
            isSecret: false,
            enabled: true,
            environmentId: env.id,
          });
        }

        // Secrets
        for (const [key, value] of Object.entries(env.secrets || {})) {
          allVariables.push({
            key,
            value,
            scope: "secrets",
            scopeName: env.name,
            priority: env.id === activeEnvironmentId ? 3 : 6, // Active env gets higher priority
            isSecret: true,
            enabled: true,
            environmentId: env.id,
          });
        }
      }

      // 3. Global variables (lowest priority)
      for (const [index, variable] of globalVariables.entries()) {
        allVariables.push({
          key: variable.key,
          value: variable.value,
          scope: "globals",
          scopeName: "Global",
          priority: 7, // Lowest priority after all environments
          isSecret: variable.type === "secret",
          enabled: variable.enabled,
          index,
        });
      }

      return allVariables;
    }, [
      activeCollectionId,
      collections,
      activeEnvironmentId,
      environments,
      globalVariables,
    ]);

  // Get variables for summary view with conflict detection
  const summaryVariables = React.useMemo(() => {
    const allVars = getAllVariablesWithScope();

    // Group by variable name to detect conflicts
    const varGroups = new Map<string, VariableWithScope[]>();
    for (const variable of allVars) {
      if (!varGroups.has(variable.key)) {
        varGroups.set(variable.key, []);
      }
      varGroups.get(variable.key)!.push(variable);
    }

    // Sort each group by priority and mark conflicts
    const result: (VariableWithScope & {
      hasConflict?: boolean;
      isWinner?: boolean;
    })[] = [];
    for (const [, vars] of varGroups) {
      const sortedVars = vars.sort((a, b) => a.priority - b.priority);
      const hasConflict = sortedVars.length > 1;

      for (const [index, variable] of sortedVars.entries()) {
        result.push({
          ...variable,
          hasConflict,
          isWinner: index === 0, // First in sorted array wins
        });
      }
    }

    return result.sort((a, b) => {
      // Sort by priority first, then by key name
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.key.localeCompare(b.key);
    });
  }, [getAllVariablesWithScope]);

  const handleCreateEnvironment = () => {
    if (!newEnvName.trim()) return;

    const envId = addEnvironment({
      name: newEnvName.trim(),
      values: {},
      secrets: {},
      secretKeys: [],
    });

    setSelectedEnvId(envId);
    setNewEnvName("");
  };

  // Auto-hide secrets after 10 seconds for security
  const toggleSecrets = () => {
    if (showSecrets) {
      // Hide immediately
      setShowSecrets(false);
      if (hideTimer) {
        clearTimeout(hideTimer);
        setHideTimer(null);
      }
    } else {
      // Show and start 10-second timer
      setShowSecrets(true);
      if (hideTimer) clearTimeout(hideTimer); // Clear any existing timer
      const timer = setTimeout(() => {
        setShowSecrets(false);
        setHideTimer(null);
      }, 10000); // 10 seconds
      setHideTimer(timer);
    }
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [hideTimer]);

  const handleAddVariable = () => {
    if (!newVarKey.trim() || !selectedEnv) return;

    if (newVarIsSecret) {
      const newSecrets = { ...selectedEnv.secrets, [newVarKey]: newVarValue };
      const newSecretKeys = [...selectedEnv.secretKeys, newVarKey];
      updateEnvironment(selectedEnv.id, {
        secrets: newSecrets,
        secretKeys: newSecretKeys,
      }).catch(console.error);
    } else {
      const newVars = { ...selectedEnv.values, [newVarKey]: newVarValue };
      updateEnvironment(selectedEnv.id, {
        values: newVars,
      }).catch(console.error);
    }

    setNewVarKey("");
    setNewVarValue("");
    setNewVarIsSecret(false);
  };

  const handleDeleteVariable = (key: string, isSecret: boolean) => {
    if (!selectedEnv) return;

    if (isSecret) {
      const newSecrets = { ...selectedEnv.secrets };
      delete newSecrets[key];
      const newSecretKeys = selectedEnv.secretKeys.filter((k) => k !== key);
      updateEnvironment(selectedEnv.id, {
        secrets: newSecrets,
        secretKeys: newSecretKeys,
      });
    } else {
      const newVars = { ...selectedEnv.values };
      delete newVars[key];
      updateEnvironment(selectedEnv.id, {
        values: newVars,
      });
    }
  };

  const handleUpdateVariable = (
    key: string,
    value: string,
    isSecret: boolean,
  ) => {
    if (!selectedEnv) return;

    if (isSecret) {
      const newSecrets = { ...selectedEnv.secrets, [key]: value };
      updateEnvironment(selectedEnv.id, { secrets: newSecrets });
    } else {
      const newVars = { ...selectedEnv.values, [key]: value };
      updateEnvironment(selectedEnv.id, { values: newVars });
    }
  };

  const handleAddGlobalVariable = () => {
    if (!newVarKey.trim()) return;

    addGlobalVariable({
      key: newVarKey,
      value: newVarValue,
      type: newVarIsSecret ? "secret" : "default",
    });

    setNewVarKey("");
    setNewVarValue("");
    setNewVarIsSecret(false);
  };

  // Filter variables based on search
  const filterVariables = (vars: Record<string, string>) => {
    if (!searchQuery) return Object.entries(vars);
    return Object.entries(vars).filter(
      ([key, value]) =>
        key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        value.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Left Panel - Environment/Mode Selector */}
      <ResizablePanel
        defaultSize={20}
        minSize={15}
        maxSize={30}
        className="bg-sidebar"
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Variable Scopes</h3>
              <div className="space-y-1">
                {/* Summary View - First */}
                <button
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    viewMode === "summary"
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                  )}
                  onClick={() => setViewMode("summary")}
                >
                  <BarChart3 className="h-4 w-4" />
                  Summary
                  {summaryVariables.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {summaryVariables.length}
                    </Badge>
                  )}
                </button>

                {/* Global Variables - Second */}
                <button
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    viewMode === "globals"
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                  )}
                  onClick={() => setViewMode("globals")}
                >
                  <Globe className="h-4 w-4" />
                  Global Variables
                  {globalVariables.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {globalVariables.length}
                    </Badge>
                  )}
                </button>

                {/* Environments - Third */}
                <button
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    viewMode === "environments"
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                  )}
                  onClick={() => {
                    setViewMode("environments");
                    // Auto-select first environment if none selected
                    if (
                      !selectedEnvId &&
                      Array.from(environments.values()).length > 0
                    ) {
                      const firstEnv = Array.from(environments.values())[0];
                      setSelectedEnvId(firstEnv.id);
                    }
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Environments
                  {Array.from(environments.values()).length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {Array.from(environments.values()).length}
                    </Badge>
                  )}
                </button>
              </div>
            </div>
          </div>

          {viewMode === "environments" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Environments</h4>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setNewEnvName("New Environment")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* New Environment Input */}
                {newEnvName && (
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={newEnvName}
                      onChange={(e) => setNewEnvName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreateEnvironment()
                      }
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleCreateEnvironment}>
                      Add
                    </Button>
                  </div>
                )}

                {/* Environment List */}
                <div className="space-y-1">
                  {Array.from(environments.values()).map((env) => (
                    <div
                      key={env.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded cursor-pointer",
                        selectedEnvId === env.id
                          ? "bg-accent"
                          : "hover:bg-accent/50",
                      )}
                      onClick={() => setSelectedEnvId(env.id)}
                    >
                      <span className="text-sm">{env.name}</span>
                      {activeEnvironmentId === env.id && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Center Panel - Variable Editor */}
      <ResizablePanel defaultSize={80}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">
                  {viewMode === "summary"
                    ? "Variable Summary - All Scopes"
                    : viewMode === "environments" && selectedEnv
                      ? `${selectedEnv.name} Variables`
                      : viewMode === "globals"
                        ? "Global Variables"
                        : "Select an environment"}
                </h2>
                <Button size="sm" variant="ghost" onClick={toggleSecrets}>
                  {showSecrets ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="ml-2">
                    {showSecrets ? "Hide" : "Show"} Secrets
                  </span>
                </Button>
              </div>

              {viewMode === "environments" && selectedEnv && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveEnvironment(selectedEnv.id)}
                    disabled={activeEnvironmentId === selectedEnv.id}
                  >
                    Set Active
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      deleteEnvironment(selectedEnv.id);
                      setSelectedEnvId(null);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Content */}
          {viewMode === "summary" ||
          (viewMode === "environments" && selectedEnv) ||
          viewMode === "globals" ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Add Variable Form - Only show for non-summary views */}
              {viewMode !== "summary" && (
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Variable name"
                      value={newVarKey}
                      onChange={(e) => setNewVarKey(e.target.value)}
                      className="flex-1"
                    />
                    {newVarIsSecret ? (
                      <PasswordInput
                        placeholder="Value"
                        value={newVarValue}
                        onChange={(e: { target: { value: string } }) =>
                          setNewVarValue(e.target.value)
                        }
                        onKeyDown={(e: { key: string }) =>
                          e.key === "Enter" &&
                          (viewMode === "environments"
                            ? handleAddVariable()
                            : handleAddGlobalVariable())
                        }
                        className="flex-1"
                        defaultVisible={showSecrets}
                      />
                    ) : (
                      <Input
                        placeholder="Value"
                        value={newVarValue}
                        onChange={(e) => setNewVarValue(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (viewMode === "environments"
                            ? handleAddVariable()
                            : handleAddGlobalVariable())
                        }
                        className="flex-1"
                      />
                    )}
                    <Select
                      value={newVarIsSecret ? "secret" : "variable"}
                      onValueChange={(v) => setNewVarIsSecret(v === "secret")}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="variable">Variable</SelectItem>
                        <SelectItem value="secret">Secret</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={
                        viewMode === "environments"
                          ? handleAddVariable
                          : handleAddGlobalVariable
                      }
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* Variable List */}
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Value</TableHead>
                      {viewMode === "summary" && (
                        <TableHead className="w-[120px]">Scope</TableHead>
                      )}
                      <TableHead className="w-[100px]">Type</TableHead>
                      {viewMode !== "summary" && (
                        <TableHead className="w-[50px]"></TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Summary View */}
                    {viewMode === "summary" &&
                      summaryVariables
                        .filter((variable) => {
                          if (!searchQuery) return true;
                          return (
                            variable.key
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            variable.value
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            variable.scopeName
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase())
                          );
                        })
                        .map((variable, index) => (
                          <TableRow
                            key={`${variable.scope}-${variable.key}-${index}`}
                            className={cn(
                              variable.hasConflict &&
                                !variable.isWinner &&
                                "opacity-60",
                              activeEnvironmentId &&
                                variable.environmentId ===
                                  activeEnvironmentId &&
                                "bg-accent/20",
                              variable.scope === "collection" &&
                                "bg-blue-50 dark:bg-blue-950/20",
                            )}
                          >
                            <TableCell
                              className={cn(
                                "font-mono text-sm",
                                variable.hasConflict &&
                                  variable.isWinner &&
                                  "font-bold",
                              )}
                            >
                              {variable.key}
                              {variable.hasConflict && variable.isWinner && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-xs"
                                >
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {variable.isSecret ? (
                                <div className="font-mono text-sm text-muted-foreground">
                                  {showSecrets ? variable.value : "••••••••"}
                                </div>
                              ) : (
                                <div className="font-mono text-sm">
                                  {variable.value}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  variable.scope === "collection"
                                    ? "default"
                                    : activeEnvironmentId &&
                                        variable.environmentId ===
                                          activeEnvironmentId
                                      ? "default"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {variable.scopeName}
                                {activeEnvironmentId &&
                                  variable.environmentId ===
                                    activeEnvironmentId &&
                                  variable.scope !== "globals" &&
                                  " (Active)"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {variable.isSecret ? (
                                <Badge variant="outline" className="gap-1">
                                  <Lock className="h-3 w-3" />
                                  Secret
                                </Badge>
                              ) : (
                                <Badge variant="outline">Variable</Badge>
                              )}
                              {!variable.enabled && (
                                <Badge
                                  variant="destructive"
                                  className="ml-1 text-xs"
                                >
                                  Disabled
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}

                    {viewMode === "environments" && selectedEnv && (
                      <>
                        {/* Regular Variables */}
                        {filterVariables(selectedEnv.values).map(
                          ([key, value]) => (
                            <TableRow key={key}>
                              <TableCell className="font-mono text-sm">
                                {key}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={value}
                                  onChange={(e) =>
                                    handleUpdateVariable(
                                      key,
                                      e.target.value,
                                      false,
                                    )
                                  }
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">Variable</Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteVariable(key, false)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ),
                        )}

                        {/* Secrets */}
                        {selectedEnv.secretKeys.map((key) => {
                          const value = selectedEnv.secrets[key] || "";
                          if (
                            searchQuery &&
                            !key
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) &&
                            !value
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase())
                          ) {
                            return null;
                          }
                          return (
                            <TableRow key={`secret-${key}`}>
                              <TableCell className="font-mono text-sm">
                                {key}
                              </TableCell>
                              <TableCell>
                                <PasswordInput
                                  value={value}
                                  onChange={(e: {
                                    target: { value: string };
                                  }) =>
                                    handleUpdateVariable(
                                      key,
                                      e.target.value,
                                      true,
                                    )
                                  }
                                  className="h-8"
                                  defaultVisible={showSecrets}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="gap-1">
                                  <Lock className="h-3 w-3" />
                                  Secret
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteVariable(key, true)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </>
                    )}

                    {/* Global Variables */}
                    {viewMode === "globals" &&
                      globalVariables.map((variable, index) => {
                        if (
                          searchQuery &&
                          !variable.key
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) &&
                          !variable.value
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        ) {
                          return null;
                        }
                        const isSecret = variable.type === "secret";
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">
                              {variable.key}
                            </TableCell>
                            <TableCell>
                              {isSecret ? (
                                <PasswordInput
                                  value={variable.value}
                                  onChange={(e: {
                                    target: { value: string };
                                  }) =>
                                    updateGlobalVariable(index, {
                                      value: e.target.value,
                                    })
                                  }
                                  className="h-8"
                                  defaultVisible={showSecrets}
                                />
                              ) : (
                                <Input
                                  value={variable.value}
                                  onChange={(e) =>
                                    updateGlobalVariable(index, {
                                      value: e.target.value,
                                    })
                                  }
                                  className="h-8"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isSecret ? (
                                  <Badge variant="outline" className="gap-1">
                                    <Lock className="h-3 w-3" />
                                    Secret
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Variable</Badge>
                                )}
                                <Checkbox
                                  checked={variable.enabled}
                                  onCheckedChange={(checked) =>
                                    updateGlobalVariable(index, {
                                      enabled: checked as boolean,
                                    })
                                  }
                                  className="rounded"
                                />
                                <span className="text-sm">Enabled</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteGlobalVariable(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              {(viewMode as TTabs) === "summary"
                ? "No variables found across any scope"
                : viewMode === "environments"
                  ? "Select an environment or create a new one"
                  : viewMode === "globals"
                    ? "No global variables defined"
                    : "No content available"}
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
