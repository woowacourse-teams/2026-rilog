import { apiRequest, kyInstance } from '@/shared/api/client';
import { isRecord, parseApiJsonResponse } from '@/shared/api/response-validation';
import type {
	PresignedUrlCreateRequest,
	PresignedUrlCreateResponse,
	UploadFileOptions,
} from '@/shared/api/uploads/types';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

const isPresignedUrlResponse = (value: unknown): value is PresignedUrlCreateResponse => {
	if (!isRecord(value) || !isRecord(value.headers) || typeof value.uploadUrl !== 'string') return false;
	let uploadUrl: URL;
	try {
		uploadUrl = new URL(value.uploadUrl);
	} catch {
		return false;
	}
	return (
		(uploadUrl.protocol === 'https:' || uploadUrl.protocol === 'http:') &&
		!uploadUrl.username &&
		!uploadUrl.password &&
		typeof value.uploadId === 'string' &&
		value.uploadId.length > 0 &&
		typeof value.objectKey === 'string' &&
		value.objectKey.length > 0 &&
		typeof value.expiresAt === 'string' &&
		!Number.isNaN(Date.parse(value.expiresAt)) &&
		Object.entries(value.headers).every(
			([name, values]) => name.length > 0 && Array.isArray(values) && values.every((item) => typeof item === 'string'),
		)
	);
};

export const createPresignedUrl = (request: PresignedUrlCreateRequest) =>
	apiRequest(async () => {
		const response = await kyInstance.post('v1/uploads/presigned-url', { json: request });
		return parseApiJsonResponse(response, 'uploads.presign', isPresignedUrlResponse);
	});

export const uploadFileToPresignedUrl = async (
	uploadUrl: string,
	file: File,
	headers: Record<string, string[]> = {},
): Promise<void> => {
	const requestHeaders = new Headers();
	Object.entries(headers).forEach(([key, values]) => {
		requestHeaders.set(key, values.join(', '));
	});

	// S3 서명 불일치 방지: headers에 content-type이 누락된 경우 기본값 주입
	if (!requestHeaders.has('content-type')) {
		requestHeaders.set('content-type', file.type || 'application/octet-stream');
	}

	await apiRequest(() =>
		kyInstance.put(uploadUrl, {
			headers: requestHeaders,
			body: file,
		}),
	);
};

export const uploadFileWithPresignedUrl = async ({
	file,
	type,
}: UploadFileOptions): Promise<PresignedUrlCreateResponse> => {
	const contentType = file.type || 'application/octet-stream';

	const response = await createPresignedUrl({
		fileName: file.name,
		contentType,
		size: file.size,
		type,
	}).catch((error: unknown) => {
		apiErrorReporter.report(error, { operation: 'upload.presign' });

		throw error;
	});

	const data = response.data;

	await uploadFileToPresignedUrl(data.uploadUrl, file, data.headers).catch((error: unknown) => {
		apiErrorReporter.report(error, { operation: 'upload.put' });

		throw error;
	});

	return data;
};
