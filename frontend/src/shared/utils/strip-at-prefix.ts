const decodeSegment = (value: string) => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

export const stripAtPrefix = (value: string) => decodeSegment(value.trim()).replace(/^@/, '');
