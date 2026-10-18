import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { savePendingAuthAction, takePendingAuthAction } from './pending-auth-action';

describe('pending auth action', () => {
	const values = new Map<string, string>();

	beforeEach(() => {
		values.clear();
		vi.stubGlobal('sessionStorage', {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
			removeItem: (key: string) => values.delete(key),
		});
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('저장한 작업은 한 번만 복원할 수 있다', () => {
		savePendingAuthAction({ blockId: 'block-1', startOffset: 4 });
		expect(takePendingAuthAction()).toEqual({ blockId: 'block-1', startOffset: 4 });
		expect(takePendingAuthAction()).toBeNull();
	});

	it('저장한 지 10분이 지나면 작업을 실행하지 않는다', () => {
		savePendingAuthAction({ blockId: 'block-1' });
		vi.spyOn(Date, 'now').mockReturnValue(1_000_000 + 10 * 60 * 1000 + 1);
		expect(takePendingAuthAction()).toBeNull();
	});
});
