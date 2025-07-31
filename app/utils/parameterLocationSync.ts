import { UniversalParameter, ParameterLocation } from "~/types/postman";

/**
 * Utility functions for handling parameter location changes and synchronization
 */

/**
 * Update a parameter's location and handle any necessary cleanup
 * Returns the updated parameters array
 */
export function updateParameterLocation(
  parameters: UniversalParameter[],
  parameterId: string,
  newLocation: ParameterLocation,
): UniversalParameter[] {
  return parameters.map((param) => {
    if (param.id === parameterId) {
      return {
        ...param,
        location: newLocation,
      };
    }
    return param;
  });
}

/**
 * Move multiple parameters to a new location
 */
export function moveParametersToLocation(
  parameters: UniversalParameter[],
  parameterIds: string[],
  newLocation: ParameterLocation,
): UniversalParameter[] {
  const idsSet = new Set(parameterIds);

  return parameters.map((param) => {
    if (idsSet.has(param.id)) {
      return {
        ...param,
        location: newLocation,
      };
    }
    return param;
  });
}

/**
 * Get parameters that were moved FROM query location
 * Useful for tracking what needs to be removed from URL
 */
export function getParametersMovedFromQuery(
  oldParameters: UniversalParameter[],
  newParameters: UniversalParameter[],
): UniversalParameter[] {
  const oldQueryParams = oldParameters.filter((p) => p.location === "query");
  const newQueryParamIds = new Set(
    newParameters.filter((p) => p.location === "query").map((p) => p.id),
  );

  return oldQueryParams.filter((p) => !newQueryParamIds.has(p.id));
}

/**
 * Get parameters that were moved TO query location
 * Useful for tracking what needs to be added to URL
 */
export function getParametersMovedToQuery(
  oldParameters: UniversalParameter[],
  newParameters: UniversalParameter[],
): UniversalParameter[] {
  const oldQueryParamIds = new Set(
    oldParameters.filter((p) => p.location === "query").map((p) => p.id),
  );
  const newQueryParams = newParameters.filter((p) => p.location === "query");

  return newQueryParams.filter((p) => !oldQueryParamIds.has(p.id));
}

/**
 * Validate parameter location change
 * Some parameters might not be suitable for certain locations
 */
export function validateLocationChange(
  parameter: UniversalParameter,
  newLocation: ParameterLocation,
): { valid: boolean; reason?: string } {
  // File type parameters can only be in form-data
  if (parameter.type === "file" && newLocation !== "form-data") {
    return {
      valid: false,
      reason: "File parameters can only be used in form-data body",
    };
  }

  // Path parameters should have corresponding placeholders in URL
  if (newLocation === "path") {
    // This would require URL context to validate properly
    // For now, we'll allow it and let the user handle validation
  }

  return { valid: true };
}

/**
 * Get location change impact summary
 * Useful for showing user what will happen when they change locations
 */
export function getLocationChangeImpact(
  parameters: UniversalParameter[],
  parameterId: string,
  newLocation: ParameterLocation,
): {
  parameter: UniversalParameter | null;
  oldLocation: ParameterLocation | null;
  newLocation: ParameterLocation;
  willRemoveFromUrl: boolean;
  willAddToUrl: boolean;
  willAffectHeaders: boolean;
  willAffectBody: boolean;
} {
  const parameter = parameters.find((p) => p.id === parameterId) || null;
  const oldLocation = parameter?.location || null;

  return {
    parameter,
    oldLocation,
    newLocation,
    willRemoveFromUrl: oldLocation === "query" && newLocation !== "query",
    willAddToUrl: oldLocation !== "query" && newLocation === "query",
    willAffectHeaders: newLocation === "header" || oldLocation === "header",
    willAffectBody:
      ["form-data", "urlencoded"].includes(newLocation) ||
      (oldLocation ? ["form-data", "urlencoded"].includes(oldLocation) : false),
  };
}
