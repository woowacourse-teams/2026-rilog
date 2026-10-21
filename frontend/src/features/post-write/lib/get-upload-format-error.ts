const SUPPORTED_IMAGE_FORMATS: Record<string, readonly string[]> = {
	'image/jpeg': ['jpg', 'jpeg'],
	'image/png': ['png'],
	'image/webp': ['webp'],
	'image/gif': ['gif'],
};

const SUPPORTED_FILE_FORMATS: Record<string, readonly string[]> = {
	...SUPPORTED_IMAGE_FORMATS,
	'application/pdf': ['pdf'],
	'application/zip': ['zip'],
	'text/plain': ['txt'],
};

export const getUploadFormatError = (file: File, blockType: string): string | null => {
	if (blockType !== 'image' && blockType !== 'file') {
		return '지원하지 않는 파일 형식입니다.';
	}
	const formats = blockType === 'image' ? SUPPORTED_IMAGE_FORMATS : SUPPORTED_FILE_FORMATS;
	const extension = file.name.split('.').pop()?.toLowerCase();
	const isSupported = extension !== undefined && formats[file.type]?.includes(extension);
	return isSupported
		? null
		: blockType === 'image'
			? '지원하지 않는 이미지 형식입니다.'
			: '지원하지 않는 파일 형식입니다.';
};
