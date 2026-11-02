import { afterEach, expect, it, vi } from 'vitest';

import { createReadingVisitId } from './create-reading-visit-id';

afterEach(() => vi.unstubAllGlobals());

it('브라우저가 제공하는 UUID를 방문 ID로 사용한다', () => {
	const id = '12345678-1234-4123-8123-123456789abc';
	vi.stubGlobal('crypto', { randomUUID: () => id });
	expect(createReadingVisitId()).toBe(id);
});

it('로컬 HTTP에서 randomUUID가 없으면 UUID v4 형식으로 생성한다', () => {
	vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(0x11) });
	expect(createReadingVisitId()).toBe('11111111-1111-4111-9111-111111111111');
});
