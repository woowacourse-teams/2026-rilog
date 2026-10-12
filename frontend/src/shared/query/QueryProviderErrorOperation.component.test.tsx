import { useQueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import type { ErrorTrackerContext } from '@/shared/error-tracking/error-tracker';

import QueryProvider from './QueryProvider';

const { captureExceptionMock } = vi.hoisted(() => ({
	captureExceptionMock: vi.fn<(error: unknown, context?: ErrorTrackerContext) => void>(),
}));
vi.mock('@/shared/error-tracking/error-tracker-instance', () => ({
	errorTracker: { captureException: captureExceptionMock, captureMessage: vi.fn(), setUser: vi.fn() },
}));

it('조회 실패 시 query meta의 작업명을 Sentry에 전달한다', async () => {
	const error = new Error('query failed');
	const { result } = renderHook(useQueryClient, { wrapper: QueryProvider });

	await expect(
		result.current.fetchQuery({
			queryKey: ['error-operation'],
			queryFn: () => Promise.reject(error),
			retry: false,
			meta: { errorOperation: 'example.read' },
		}),
	).rejects.toBe(error);
	expect(captureExceptionMock).toHaveBeenCalledOnce();
	expect(captureExceptionMock.mock.calls[0]?.[1]?.tags?.operation).toBe('example.read');
});
