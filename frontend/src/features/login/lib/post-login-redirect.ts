const STORAGE_KEY = 'postLoginRedirect';

export const savePostLoginRedirect = () => {
	const { pathname, search, hash } = window.location;
	localStorage.setItem(STORAGE_KEY, `${pathname}${search}${hash}`);
};

export const clearPostLoginRedirect = () => {
	localStorage.removeItem(STORAGE_KEY);
};

export const takePostLoginRedirect = (): string => {
	const storedValue = localStorage.getItem(STORAGE_KEY);
	clearPostLoginRedirect();
	if (
		storedValue === null ||
		!storedValue.startsWith('/') ||
		storedValue.startsWith('//') ||
		/[\\\u0000-\u001f\u007f]/.test(storedValue)
	) {
		return '/';
	}

	try {
		return new URL(storedValue, window.location.origin).origin === window.location.origin ? storedValue : '/';
	} catch {
		return '/';
	}
};
