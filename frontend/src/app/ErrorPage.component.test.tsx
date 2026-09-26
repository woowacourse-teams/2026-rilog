import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';

import ErrorPage from './error';

const { captureExceptionMock } = vi.hoisted(() => ({ captureExceptionMock: vi.fn() }));

vi.mock('@sentry/nextjs', () => ({ captureException: captureExceptionMock }));

afterEach(() => {
	vi.restoreAllMocks();
	captureExceptionMock.mockReset();
});

it('오류 수집이 실패해도 오류 안내와 재시도 및 홈 이동을 제공한다', async () => {
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	captureExceptionMock.mockImplementation(() => {
		throw new Error('SDK capture failed');
	});
	const reset = vi.fn();
	const error = new Error('render failed');
	const user = userEvent.setup();

	render(<ErrorPage error={error} reset={reset} />);

	expect(captureExceptionMock).toHaveBeenCalledWith(error, expect.any(Object));
	expect(screen.getByRole('heading', { name: '오류가 발생했습니다' })).toBeInTheDocument();
	expect(screen.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
	await user.tab();
	expect(screen.getByRole('button', { name: '다시 시도' })).toHaveFocus();
	await user.keyboard('{Enter}');
	expect(reset).toHaveBeenCalledOnce();
});
