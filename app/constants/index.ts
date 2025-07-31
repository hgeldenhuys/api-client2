// Time-related constants (in milliseconds)
export const TIMEOUTS = {
  MEMORY_CLEAR_DELAY: 30000, // 30 seconds
  AUTO_SAVE_DELAY: 1000, // 1 second
  ENV_AUTO_SAVE_DELAY: 500, // 500ms for environment changes
  PROXY_CHECK_TIMEOUT: 3000, // 3 seconds
  TOKEN_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minutes before expiry
  SCRIPT_EXECUTION_TIMEOUT: 35000, // 35 seconds
  WORKER_TIMEOUT: 30000, // 30 seconds
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  MULTIPLE_CHOICES: 300,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const HTTP_STATUS_RANGES = {
  SUCCESS: { min: 200, max: 299 },
  REDIRECT: { min: 300, max: 399 },
  CLIENT_ERROR: { min: 400, max: 499 },
  SERVER_ERROR: { min: 500, max: 599 },
} as const;

// UI Constants
export const UI = {
  INDENT_SIZE: 16, // pixels for tree indentation
  ICON_SIZE: 24, // default icon size
  OAUTH_WINDOW: {
    WIDTH: 600,
    HEIGHT: 700,
  },
  EDITOR_DEFAULT_HEIGHT: "100%",
  OPACITY: {
    HIDDEN: 0,
    VISIBLE: 100,
  },
} as const;

// Cryptography Constants
export const CRYPTO = {
  AES_KEY_LENGTH: 256,
  AES_ALGORITHM: "AES-GCM",
  HASH_ALGORITHM: "SHA-256",
  SALT_LENGTH: 32, // bytes
  RANDOM_BYTES: {
    SMALL: 16,
    MEDIUM: 32,
    LARGE: 64,
  },
} as const;

// Network Ports
export const PORTS = {
  DEV_SERVER: 5173,
  PROXY_DEFAULT: 8080,
} as const;

// Time Durations
export const DURATIONS = {
  ONE_SECOND: 1000,
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// Cookie Settings
export const COOKIE = {
  THEME_MAX_AGE: 60 * 60 * 24 * 365, // 1 year in seconds
} as const;

// Performance Thresholds
export const PERFORMANCE = {
  RESPONSE_TIME_GOOD: 500, // ms
  RESPONSE_TIME_WARNING: 1000, // ms
  RESPONSE_TIME_BAD: 2000, // ms
  FILE_SIZE_KB: 1024, // bytes
} as const;

// API Constants
export const API = {
  MIN_KEY_LENGTH: 16, // minimum API key length
  RANDOM_INT_MAX: 1000,
} as const;

// Number System
export const NUMBER_SYSTEM = {
  BINARY: 2,
  OCTAL: 8,
  DECIMAL: 10,
  HEX: 16,
} as const;

// Font Weights
export const FONT_WEIGHT = {
  NORMAL: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 700,
} as const;

// Percentages
export const PERCENTAGE = {
  FULL: 100,
  HALF: 50,
  QUARTER: 25,
  NONE: 0,
} as const;

// Method Colors (for UI)
export const METHOD_COLORS = {
  GET: { text: "text-green-700", bg: "bg-green-100" },
  POST: { text: "text-blue-700", bg: "bg-blue-100" },
  PUT: { text: "text-orange-700", bg: "bg-orange-100" },
  DELETE: { text: "text-red-700", bg: "bg-red-100" },
  PATCH: { text: "text-purple-700", bg: "bg-purple-100" },
} as const;

// Response Status Colors
export const STATUS_COLORS = {
  SUCCESS: "bg-green-500",
  REDIRECT: "bg-blue-500",
  CLIENT_ERROR: "bg-yellow-500",
  SERVER_ERROR: "bg-red-500",
} as const;
