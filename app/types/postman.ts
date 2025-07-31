export interface PostmanCollection {
  info: CollectionInfo;
  item: (RequestItem | FolderItem)[];
  event?: Event[];
  variable?: Variable[];
  auth?: Auth;
}

export interface CollectionInfo {
  name: string;
  _postman_id: string;
  description?: string;
  schema: string;
}

export interface RequestItem {
  id?: string;
  name: string;
  request: Request;
  response?: Response[];
  event?: Event[];
  auth?: Auth;
  universalParameters?: UniversalParameter[]; // Extension for universal parameter support
}

export interface FolderItem {
  id?: string;
  name: string;
  item: (RequestItem | FolderItem)[];
  description?: string;
  event?: Event[];
  auth?: Auth;
  variable?: Variable[];
}

export interface Request {
  url: Url | string;
  method: HttpMethod;
  header?: Header[];
  body?: Body;
  auth?: Auth;
  description?: string;
}

export interface Url {
  raw: string;
  protocol?: string;
  host?: string[];
  port?: string;
  path?: string[];
  query?: QueryParam[];
  hash?: string;
  variable?: Variable[];
}

export interface Header {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
  description?: string;
}

export interface QueryParam {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

// Universal Parameters System
export type ParameterLocation =
  | "query"
  | "header"
  | "form-data"
  | "urlencoded"
  | "path";

export interface UniversalParameter {
  id: string;
  key: string;
  value: string;
  location: ParameterLocation;
  enabled: boolean;
  description?: string;
  type?: "text" | "file"; // for form-data
  src?: string; // file path for file type
}

export interface ParameterLocationInfo {
  location: ParameterLocation;
  label: string;
  icon: string;
  description: string;
  supportsFiles: boolean;
  validationRules: {
    keyPattern?: RegExp;
    valuePattern?: RegExp;
    maxLength?: number;
    allowSpaces?: boolean;
  };
}

export interface Body {
  mode: BodyMode;
  raw?: string;
  urlencoded?: FormParam[];
  formdata?: FormParam[];
  file?: FileBody;
  graphql?: GraphQLBody;
  options?: BodyOptions;
}

export type BodyMode = "raw" | "urlencoded" | "formdata" | "file" | "graphql";

export interface FormParam {
  key: string;
  value: string;
  type?: "text" | "file";
  src?: string;
  disabled?: boolean;
  description?: string;
}

export interface FileBody {
  src: string;
}

export interface GraphQLBody {
  query: string;
  variables?: string;
}

export interface BodyOptions {
  raw?: {
    language?: "json" | "javascript" | "xml" | "html" | "text";
  };
}

export interface Auth {
  type: AuthType;
  apikey?: AuthParam[];
  awsv4?: AuthParam[];
  basic?: AuthParam[];
  bearer?: AuthParam[];
  digest?: AuthParam[];
  edgegrid?: AuthParam[];
  hawk?: AuthParam[];
  noauth?: null;
  oauth1?: AuthParam[];
  oauth2?: AuthParam[];
  ntlm?: AuthParam[];
  jwt?: AuthParam[];
  custom?: AuthParam[];
}

export type AuthType =
  | "apikey"
  | "awsv4"
  | "basic"
  | "bearer"
  | "digest"
  | "edgegrid"
  | "hawk"
  | "noauth"
  | "oauth1"
  | "oauth2"
  | "ntlm"
  | "jwt"
  | "custom";

export interface AuthParam {
  key: string;
  value: string;
  type?: string;
}

export interface Variable {
  id?: string;
  key: string;
  value: string;
  type?: "string" | "boolean" | "number" | "any";
  disabled?: boolean;
  description?: string;
}

export interface Event {
  listen: "prerequest" | "test";
  script: Script;
}

export interface Script {
  id?: string;
  type?: string;
  exec?: string[];
  src?: Url | string;
}

export interface Response {
  id?: string;
  name?: string;
  status?: string;
  code?: number;
  header?: Header[];
  body?: string;
  _postman_previewlanguage?: string;
}

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS"
  | "CONNECT"
  | "TRACE";

export function isRequestItem(
  item: RequestItem | FolderItem,
): item is RequestItem {
  return "request" in item;
}

export function isFolderItem(
  item: RequestItem | FolderItem,
): item is FolderItem {
  return "item" in item;
}

// Re-export Auth as RequestAuth for compatibility
export type RequestAuth = Auth;
