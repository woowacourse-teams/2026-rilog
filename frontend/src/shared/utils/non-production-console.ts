const canWriteConsole = () => process.env.NODE_ENV !== 'production';

export const logNonProductionInfo = (...data: unknown[]): void => {
	if (canWriteConsole()) {
		console.log(...data);
	}
};

export const logNonProductionWarning = (...data: unknown[]): void => {
	if (canWriteConsole()) {
		console.warn(...data);
	}
};

export const logNonProductionError = (...data: unknown[]): void => {
	if (canWriteConsole()) {
		console.error(...data);
	}
};
