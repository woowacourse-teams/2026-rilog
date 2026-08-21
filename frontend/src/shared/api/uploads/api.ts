import { apiClient, apiRequest, kyInstance } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import type {
	PresignedUrlCreateRequest,
	PresignedUrlCreateResponse,
	UploadFileOptions,
} from '@/shared/api/uploads/types';

export const createPresignedUrl = (request: PresignedUrlCreateRequest) =>
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
	});

	const data = response.data;
	if (!data) {
		throw new Error('Presigned URL 발급 응답 데이터가 존재하지 않습니다.');
	}

	await uploadFileToPresignedUrl(data.uploadUrl, file, data.headers);

	return data;
};
