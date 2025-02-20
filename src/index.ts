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

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<DsaltaConfig> = {
	timeout: 5000,
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
	 * @throws {Error} If required config values are not provided
	 */
	constructor(config: DsaltaConfig) {
		this.validateConfig(config);
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.client = this.createHttpClient();
	}

	/**
	 * Validates the provided configuration
	 * @param config - Configuration to validate
	 * @throws {Error} If required config values are not provided
	 */
	private validateConfig(config: DsaltaConfig): void {
		if (!config.apiKey) {
			throw new Error('API key is required');
		}
		if (!config.baseUrl) {
			throw new Error('Base URL is required');
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
	 * @param file - Input file
	 * @returns Object containing filename and MIME type
	 */
	private getFileInfo(file: File): FileInfo {
		return {
			filename: file.name,
			fileType: file.type || 'application/octet-stream',
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
	private createFormData(file: File, metadata?: FileMetadata): FormData {
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
	 * @param file - File object
	 */
	private createErrorResponse(
		message: string,
		status: number,
		code: string | undefined,
		fileInfo: FileInfo,
		file: File,
	): HashFileResponse {
		return {
			success: false,
			timestamp: new Date().toISOString(),
			file: file,
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
	 * @param originalFile - Original file object
	 */
	private createSuccessResponse(
		responseData: ApiSuccessResponse,
		fileInfo: FileInfo,
		base64File: string,
		originalFile: File,
	): HashFileResponse {
		return {
			success: true,
			timestamp: responseData.timestamp,
			file: originalFile,
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
	 * @param file - File to hash
	 * @param metadata - Optional metadata to attach to the hash
	 * @returns Promise resolving to HashFileResponse
	 */
	async hashFile(file: File, metadata?: FileMetadata): Promise<HashFileResponse> {
		const fileInfo = this.getFileInfo(file);

		try {
			const formData = this.createFormData(file, metadata);
			const response = await this.client.post<ApiResponse>('/hash/file', formData, {
				headers: {
					...formData.getHeaders(),
				},
			});

			const { data: responseData } = response;

			if (responseData.success) {
				return {
					success: true,
					timestamp: responseData.timestamp,
					file: file,
					filename: responseData.data.filename || fileInfo.filename,
					fileType: responseData.data.fileType || fileInfo.fileType,
					data: {
						hash: responseData.data.hash,
						metadata: responseData.data.metadata,
						base64File: responseData.data.file,
					},
				};
			}

			return {
				success: false,
				timestamp: new Date().toISOString(),
				file: file,
				filename: fileInfo.filename,
				fileType: fileInfo.fileType,
				error: {
					message: responseData.message,
					status: responseData.status,
					code: responseData.code,
				},
			};
		} catch (error) {
			if (axios.isAxiosError(error) && error.response?.data) {
				const errorData = error.response.data as ApiErrorResponse;
				return {
					success: false,
					timestamp: new Date().toISOString(),
					file: file,
					filename: fileInfo.filename,
					fileType: fileInfo.fileType,
					error: {
						message: errorData.message || error.message,
						status: errorData.status || error.response.status || 500,
						code: errorData.code,
					},
				};
			}

			return {
				success: false,
				timestamp: new Date().toISOString(),
				file: file,
				filename: fileInfo.filename,
				fileType: fileInfo.fileType,
				error: {
					message: error instanceof Error ? error.message : 'An unexpected error occurred',
					status: 500,
					code: 'UNEXPECTED_ERROR',
				},
			};
		}
	}
}

export default Dsalta;
export * from './types';
