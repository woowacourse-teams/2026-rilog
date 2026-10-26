export const getUploadedUrl = (result: unknown): string | null => {
	if (typeof result === 'string') {
		return result === '' ? null : result;
	}
	if (typeof result !== 'object' || result === null || !('props' in result)) {
		return null;
	}
	const props = result.props;
	if (typeof props !== 'object' || props === null || !('url' in props)) {
		return null;
	}
	return typeof props.url === 'string' && props.url !== '' ? props.url : null;
};
