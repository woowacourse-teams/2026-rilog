const STORAGE_KEY = 'pendingAuthAction';
const MAX_AGE_MS = 10 * 60 * 1000;

export const clearPendingAuthAction = () => {
	sessionStorage.removeItem(STORAGE_KEY);
};

export const savePendingAuthAction = (value: unknown) => {
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ createdAt: Date.now(), value }));
		return true;
	} catch {
		return false;
	}
};

export const takePendingAuthAction = (matches?: (value: unknown) => boolean): unknown => {
	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (raw === null) return null;

	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || !('createdAt' in parsed) || !('value' in parsed)) {
			clearPendingAuthAction();
			return null;
		}
		const { createdAt, value } = parsed;
		if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) {
			clearPendingAuthAction();
			return null;
		}
		const age = Date.now() - createdAt;
		if (age < 0 || age > MAX_AGE_MS) {
			clearPendingAuthAction();
			return null;
		}
		if (matches !== undefined && !matches(value)) return null;
		clearPendingAuthAction();
		return value;
	} catch {
		clearPendingAuthAction();
		return null;
	}
};
