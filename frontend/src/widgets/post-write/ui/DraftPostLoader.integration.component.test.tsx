import { screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';
import { renderWithQuery } from '@/test/render-with-query';

import DraftPostLoader from './DraftPostLoader';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

vi.mock('@/features/analytics/ui/ContentLoadFailureTracker', () => ({ default: () => null }));
vi.mock('./DraftPostController', () => ({ default: () => <p>편집기 시작</p> }));

afterEach(() => {
	vi.unstubAllGlobals();
});

it('서버가 손상된 초안 본문을 보내면 편집기를 시작하지 않고 조회 오류를 표시한다', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(
			Response.json({
				status: 200,
				message: 'OK',
				data: { draftId: 42, title: '원래 제목', content: null, status: 'DRAFT', publishedAt: '2026-08-27T10:42:11Z' },
			}),
		),
	);
	const { queryClient } = renderWithQuery(<DraftPostLoader draftId={42} />);

	expect(await screen.findByRole('alert')).toHaveTextContent('임시저장 글을 불러오지 못했습니다.');
	expect(screen.queryByText('편집기 시작')).not.toBeInTheDocument();
	expect(queryClient.getQueryData(draftsQueryKeys.detail(42))).toBeUndefined();
});
