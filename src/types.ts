/**
 * Configuration options for the Dsalta SDK
 */
export interface DsaltaConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL of the Dsalta API */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Hash algorithm to use */
  hashAlgorithm?: string;
}

/**
 * Custom metadata that can be attached to a file
 */
export interface FileMetadata {
  [key: string]: unknown;
}

/**
 * File information containing name and type
 */
export interface FileInfo {
  /** Name of the file */
  filename: string;
  /** MIME type of the file */
  fileType: string;
}

/**
 * Error response details
 */
export interface DsaltaError {
  /** Error message */
  message: string;
  /** HTTP status code */
  status?: number;
  /** Error code for specific error types */
  code?: string;
}

/**
 * Success response data containing hash and metadata
 */
export interface HashFileSuccessData {
  /** Generated hash of the file */
  hash: string;
  /** User provided metadata */
  metadata: FileMetadata;
  /** Original base64 encoded file content */
  base64File?: string;
}

/**
 * Response from the hash file operation
 */
export interface HashFileResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** ISO timestamp of the operation */
  timestamp: string;
  /** Original file */
  file: File;
  /** Original or processed filename */
  filename: string;
  /** MIME type of the file */
  fileType: string;
  /** Error details if operation failed */
  error?: DsaltaError;
  /** Success response data */
  data?: HashFileSuccessData;
}

/**
 * API success response structure
 */
export interface ApiSuccessResponse {
  success: true;
  timestamp: string;
  data: {
    file: string;
    hash: string;
    metadata: FileMetadata;
    filename?: string;
    fileType?: string;
  };
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  timestamp: string;
  message: string;
  status: number;
  code?: string;
  data?: {
    file?: string;
  };
}

/**
 * Combined API response type
 */
export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;
