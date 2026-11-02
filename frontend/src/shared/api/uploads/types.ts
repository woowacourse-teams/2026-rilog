export type UploadType = 'IMAGE' | 'FILE';
export type ImagePurpose = 'PROFILE' | 'CONTENT';

export interface PresignedUrlCreateRequest {
	fileName: string;
	contentType: string;
	size: number;
	type: UploadType;
	imagePurpose: ImagePurpose;
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
	imagePurpose?: ImagePurpose;
}
