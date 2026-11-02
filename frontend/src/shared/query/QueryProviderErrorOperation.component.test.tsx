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
	expect(captureExceptionMock.mock.calls[0]?.[1]?.tags).toMatchObject({
		operation: 'example.read',
		user_impact: 'load_failed',
	});
});

it('이전 데이터가 남은 재조회 실패는 최초 로딩 실패와 구분한다', async () => {
	const { result } = renderHook(useQueryClient, { wrapper: QueryProvider });
	result.current.setQueryData(['retained-data'], { items: ['existing'] });
	const error = new Error('refresh failed');
	await expect(
		result.current.fetchQuery({ queryKey: ['retained-data'], queryFn: () => Promise.reject(error), retry: false }),
	).rejects.toBe(error);
	expect(captureExceptionMock.mock.calls.at(-1)?.[1]?.tags?.user_impact).toBe('load_failed_with_data');
	expect(result.current.getQueryData(['retained-data'])).toEqual({ items: ['existing'] });
});
