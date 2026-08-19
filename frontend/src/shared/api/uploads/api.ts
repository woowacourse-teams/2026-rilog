import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import type {
	PreSignedUrlCreateRequest,
	PresignedUrlCreateResponse,
	UploadFileOptions,
} from '@/shared/api/uploads/types';

export const createPresignedUrl = (request: PreSignedUrlCreateRequest) =>
	apiClient.post<ApiResponse<PresignedUrlCreateResponse>>('v1/uploads/presigned-url', {
		json: request,
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

	const response = await fetch(uploadUrl, {
		method: 'PUT',
		headers: requestHeaders,
		body: file,
	});

	if (!response.ok) {
		throw new Error(`S3 파일 업로드에 실패했습니다. (HTTP ${response.status})`);
	}
};

export const uploadFileWithPresignedUrl = async ({
	file,
	type,
}: UploadFileOptions): Promise<PresignedUrlCreateResponse> => {
	const response = await createPresignedUrl({
		fileName: file.name,
		contentType: file.type || 'application/octet-stream',
		size: file.size,
		type,
	});

	const data = response.data;
	if (!data) {
		throw new Error('Presigned URL 발급 응답 데이터가 존재하지 않습니다.');
	}

	await uploadFileToPresignedUrl(data.uploadUrl, file, data.headers);

	return data;
};
