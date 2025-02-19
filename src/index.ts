import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import {
	DsaltaConfig,
	FileMetadata,
	HashFileResponse,
	FileInfo,
	ApiResponse,
	ApiSuccessResponse,
	ApiErrorResponse,
} from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<DsaltaConfig> = {
	baseUrl: 'http://localhost:3003',
	timeout: 5000,
	hashAlgorithm: 'sha256',
};

/**
 * Main SDK class for interacting with the Dsalta API
 */
class Dsalta {
	private readonly client: AxiosInstance;
	private readonly config: DsaltaConfig;

	/**
	 * Creates a new instance of the Dsalta SDK
	 * @param config - Configuration options
	 * @throws {Error} If API key is not provided
	 */
	constructor(config: DsaltaConfig) {
		this.validateConfig(config);
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.client = this.createHttpClient();
	}

	/**
	 * Validates the provided configuration
	 * @param config - Configuration to validate
	 * @throws {Error} If API key is not provided
	 */
	private validateConfig(config: DsaltaConfig): void {
		if (!config.apiKey) {
			throw new Error('API key is required');
		}
	}

	/**
	 * Creates an Axios instance with the configured options
	 */
	private createHttpClient(): AxiosInstance {
		return axios.create({
			baseURL: this.config.baseUrl,
			timeout: this.config.timeout,
			headers: {
				Authorization: `Bearer ${this.config.apiKey}`,
				Accept: 'application/json',
			},
		});
	}

	/**
	 * Extracts file information from the input
	 * @param file - Input file (path, Buffer, or ReadStream)
	 * @returns Object containing filename and MIME type
	 */
	private getFileInfo(file: string | Buffer | NodeJS.ReadableStream): FileInfo {
		if (typeof file === 'string') {
			const filename = path.basename(file);
			return {
				filename,
				fileType: mime.lookup(filename) || 'application/octet-stream',
			};
		}

		return {
			filename: 'file',
			fileType: 'application/octet-stream',
		};
	}

	/**
	 * Converts various file inputs to a Buffer
	 * @param file - Input file (path, Buffer, or ReadStream)
	 * @returns Promise resolving to a Buffer
	 */
	private async fileToBuffer(file: string | Buffer | NodeJS.ReadableStream): Promise<Buffer> {
		if (Buffer.isBuffer(file)) {
			return file;
		}

		if (typeof file === 'string') {
			return fs.promises.readFile(file);
		}

		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			file.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
			file.on('end', () => resolve(Buffer.concat(chunks)));
			file.on('error', reject);
		});
	}

	/**
	 * Creates a form data object with file and metadata
	 * @param file - File to include in form
	 * @param metadata - Optional metadata to attach
	 */
	private createFormData(
		file: string | Buffer | NodeJS.ReadableStream,
		metadata?: FileMetadata,
	): FormData {
		const formData = new FormData();
		formData.append('file', file);

		if (metadata) {
			formData.append('metadata', JSON.stringify(metadata));
		}

		return formData;
	}

	/**
	 * Creates an error response
	 * @param message - Error message
	 * @param status - HTTP status code
	 * @param code - Error code
	 * @param fileInfo - File information
	 * @param fileBuffer - File content
	 */
	private createErrorResponse(
		message: string,
		status: number,
		code: string | undefined,
		fileInfo: FileInfo,
		fileBuffer: Buffer,
	): HashFileResponse {
		return {
			success: false,
			timestamp: new Date().toISOString(),
			file: fileBuffer,
			filename: fileInfo.filename,
			fileType: fileInfo.fileType,
			error: {
				message,
				status,
				code,
			},
		};
	}

	/**
	 * Creates a success response
	 * @param responseData - API response data
	 * @param fileInfo - File information
	 * @param base64File - Base64 encoded file content
	 */
	private createSuccessResponse(
		responseData: ApiSuccessResponse,
		fileInfo: FileInfo,
		base64File: string,
	): HashFileResponse {
		return {
			success: true,
			timestamp: responseData.timestamp,
			file: Buffer.from(base64File, 'base64'),
			filename: responseData.data.filename || fileInfo.filename,
			fileType: responseData.data.fileType || fileInfo.fileType,
			data: {
				hash: responseData.data.hash,
				metadata: responseData.data.metadata,
				base64File,
			},
		};
	}

	/**
	 * Hashes a file with optional metadata
	 * @param file - File to hash (path, Buffer, or ReadStream)
	 * @param metadata - Optional metadata to attach to the hash
	 * @returns Promise resolving to HashFileResponse
	 */
	async hashFile(
		file: string | Buffer | NodeJS.ReadableStream,
		metadata?: FileMetadata,
	): Promise<HashFileResponse> {
		const fileInfo = this.getFileInfo(file);
		let fileBuffer: Buffer;

		try {
			fileBuffer = await this.fileToBuffer(file);
		} catch (error) {
			return this.createErrorResponse(
				`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
				400,
				'FILE_READ_ERROR',
				fileInfo,
				Buffer.alloc(0),
			);
		}

		try {
			const formData = this.createFormData(file, metadata);
			const response = await this.client.post<ApiResponse>('/hash/file', formData, {
				headers: {
					...formData.getHeaders(),
				},
			});

			const { data: responseData } = response;

			if (responseData.success) {
				return this.createSuccessResponse(responseData, fileInfo, responseData.data.file);
			}

			if ('data' in responseData && responseData.data?.file) {
				return this.createErrorResponse(
					responseData.message,
					responseData.status,
					responseData.code,
					fileInfo,
					Buffer.from(responseData.data.file, 'base64'),
				);
			}

			return this.createErrorResponse(
				responseData.message,
				responseData.status,
				responseData.code,
				fileInfo,
				fileBuffer,
			);
		} catch (error) {
			if (axios.isAxiosError(error) && error.response?.data) {
				const errorData = error.response.data as ApiErrorResponse;
				return this.createErrorResponse(
					errorData.message || error.message,
					errorData.status || error.response.status || 500,
					errorData.code,
					fileInfo,
					fileBuffer,
				);
			}

			return this.createErrorResponse(
				error instanceof Error ? error.message : 'An unexpected error occurred',
				500,
				'UNEXPECTED_ERROR',
				fileInfo,
				fileBuffer,
			);
		}
	}
}

export default Dsalta;
export * from './types';
