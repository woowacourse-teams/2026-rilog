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

export const takePendingAuthAction = (): unknown => {
	const raw = sessionStorage.getItem(STORAGE_KEY);
	clearPendingAuthAction();
	if (raw === null) return null;

	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || !('createdAt' in parsed) || !('value' in parsed)) {
			return null;
		}
		const { createdAt, value } = parsed;
		if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return null;
		const age = Date.now() - createdAt;
		return age >= 0 && age <= MAX_AGE_MS ? value : null;
	} catch {
		return null;
	}
};
