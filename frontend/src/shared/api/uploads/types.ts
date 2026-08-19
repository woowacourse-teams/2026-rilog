export type UploadType = 'IMAGE' | 'FILE';

export interface PresignedUrlCreateRequest {
	fileName: string;
	contentType: string;
	size: number;
	type: UploadType;
}

export interface PresignedUrlCreateResponse {
	uploadId: string;
	objectKey: string;
	uploadUrl: string;
	headers: Record<string, string[]>;
	expiresAt: string;
}

export interface UploadFileOptions {
	file: File;
	type: UploadType;
}
