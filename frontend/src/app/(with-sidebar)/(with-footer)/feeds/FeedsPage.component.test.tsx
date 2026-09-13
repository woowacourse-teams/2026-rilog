import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type * as ReleaseNotesModule from '@/features/release-notes/model/release-notes';

import FeedsPage, { dynamic } from './page';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/widgets/post-feed/PostFeed', () => ({
	default: () => (
		<section>
			<h1>Rilog</h1>
			<p>홈 피드 위젯</p>
		</section>
	),
}));

vi.mock('@/features/release-notes/model/release-notes', async (importOriginal) => ({
	...(await importOriginal<typeof ReleaseNotesModule>()),
	RELEASE_NOTES: [{ id: 'test', title: '업데이트 안내', publishedAt: '2026-09-05', items: [] }],
}));

describe('FeedsPage', () => {
	it('최신 피드를 위해 동적으로 렌더링한다', () => {
		expect(dynamic).toBe('force-dynamic');
	});

	it('피드 경로에서 홈 피드 위젯을 조립한다', async () => {
		render(await FeedsPage({ searchParams: Promise.resolve({}) }));

		expect(screen.getByRole('heading', { name: 'Rilog' })).toBeInTheDocument();
		expect(screen.getByText('홈 피드 위젯')).toBeInTheDocument();
		expect(screen.getByRole('dialog', { name: '업데이트 안내' })).toBeVisible();
	});

	it('인증 필요 notice가 있으면 사용자 안내 모달을 표시한다', async () => {
		render(await FeedsPage({ searchParams: Promise.resolve({ notice: 'auth-required' }) }));

		expect(screen.getByRole('alertdialog', { name: '로그인이 필요한 페이지입니다.' })).toBeInTheDocument();
		expect(screen.queryByRole('dialog', { name: '업데이트 안내' })).not.toBeInTheDocument();
	});
});
