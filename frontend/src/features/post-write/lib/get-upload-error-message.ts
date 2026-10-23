import { isNormalizedApiError } from '@/shared/api/api-error';

import { UploadPreparationError } from './prepare-upload-file';

export const getUploadErrorMessage = (error: unknown): string =>
	error instanceof UploadPreparationError
		? error.message
		: isNormalizedApiError(error) && error.type === 'api'
			? error.detail.message
			: '파일 업로드에 실패했어요. 다시 시도해 주세요.';
