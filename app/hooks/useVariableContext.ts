import { useEnvironmentStore } from "~/stores/environmentStore";
import { useCallback } from "react";

export interface VariableContextValue {
  variables: Record<string, string>;
  addVariable: (
    key: string,
    value: string,
    scope: "global" | "environment",
  ) => void;
  updateVariable: (
    key: string,
    value: string,
    scope: "global" | "environment",
  ) => void;
  deleteVariable: (key: string, scope: "global" | "environment") => void;
  hasVariable: (key: string) => boolean;
  getVariableValue: (key: string) => string | undefined;
  isEnvironmentActive: boolean;
}

export function useVariableContext(): VariableContextValue {
  const {
    resolveAllVariables,
    setGlobalVariable,
    activeEnvironmentId,
    environments,
    globalVariables,
    updateEnvironmentVariable,
    addEnvironmentVariable,
    deleteEnvironmentVariable,
    deleteGlobalVariable,
    updateGlobalVariable,
  } = useEnvironmentStore();

  const variables = resolveAllVariables();
  const isEnvironmentActive = !!activeEnvironmentId;

  const addVariable = useCallback(
    (key: string, value: string, scope: "global" | "environment") => {
      if (scope === "global" || !activeEnvironmentId) {
        setGlobalVariable(key, value);
      } else {
        const env = environments.get(activeEnvironmentId);
        if (env) {
          addEnvironmentVariable(activeEnvironmentId, key, value);
        }
      }
    },
    [
      activeEnvironmentId,
      environments,
      setGlobalVariable,
      addEnvironmentVariable,
    ],
  );

  const updateVariable = useCallback(
    (key: string, value: string, scope: "global" | "environment") => {
      if (scope === "global") {
        const globalVarIndex = globalVariables.findIndex((v) => v.key === key);
        if (globalVarIndex >= 0) {
          updateGlobalVariable(globalVarIndex, { value });
        }
      } else if (activeEnvironmentId) {
        updateEnvironmentVariable(activeEnvironmentId, key, value);
      }
    },
    [
      activeEnvironmentId,
      globalVariables,
      updateGlobalVariable,
      updateEnvironmentVariable,
    ],
  );

  const deleteVariable = useCallback(
    (key: string, scope: "global" | "environment") => {
      if (scope === "global") {
        const globalVarIndex = globalVariables.findIndex((v) => v.key === key);
        if (globalVarIndex >= 0) {
          deleteGlobalVariable(globalVarIndex);
        }
      } else if (activeEnvironmentId) {
        deleteEnvironmentVariable(activeEnvironmentId, key);
      }
    },
    [
      activeEnvironmentId,
      globalVariables,
      deleteGlobalVariable,
      deleteEnvironmentVariable,
    ],
  );

  const hasVariable = useCallback(
    (key: string) => {
      return key in variables;
    },
    [variables],
  );

  const getVariableValue = useCallback(
    (key: string) => {
      return variables[key];
    },
    [variables],
  );

  return {
    variables,
    addVariable,
    updateVariable,
    deleteVariable,
    hasVariable,
    getVariableValue,
    isEnvironmentActive,
  };
}
