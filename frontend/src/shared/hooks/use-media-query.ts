import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(callback) => {
			if (typeof window === 'undefined' || !window.matchMedia) return () => {};
			const media = window.matchMedia(query);
			media.addEventListener('change', callback);
			return () => media.removeEventListener('change', callback);
		},
		() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
		() => false,
	);
}
