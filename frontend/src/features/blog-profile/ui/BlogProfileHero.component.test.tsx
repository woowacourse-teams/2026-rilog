import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';

import BlogProfileHero from './BlogProfileHero';

const COLOG_PROFILE_FIXTURE: BlogPublicProfile = {
	type: 'COLOG',
	id: 1,
	name: '프론트엔드 연구소',
	slug: 'frontend-lab',
	description: '사용자 경험을 함께 연구합니다.',
	profileImageUrl: '/images/frontend-lab-logo.png',
	coverImageUrl: '/images/frontend-lab-cover.png',
	serviceUrl: 'https://frontend-lab.example.com',
	githubUrl: 'https://github.com/frontend-lab',
	memberCount: 5,
	postCount: 10,
};

describe('BlogProfileHero', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('전달받은 코로그 프로필과 외부 연결 경로를 제공한다', () => {
		render(<BlogProfileHero profile={COLOG_PROFILE_FIXTURE} action={<button type="button">팀 설정</button>} />);

		expect(screen.getByRole('heading', { level: 1, name: '프론트엔드 연구소' })).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '프론트엔드 연구소 팀 로고' })).toBeInTheDocument();
		expect(screen.getByText('사용자 경험을 함께 연구합니다.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'frontend-lab.example.com' })).toHaveAttribute(
			'href',
			'https://frontend-lab.example.com',
		);
		expect(screen.getByRole('link', { name: '프론트엔드 연구소 GitHub' })).toHaveAttribute(
			'href',
			'https://github.com/frontend-lab',
		);
		expect(screen.getByRole('button', { name: '팀 설정' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '팀 설정' }).parentElement).toHaveClass(
			'z-20',
			'text-on-brand-primary',
			'drop-shadow-[0_1px_2px_rgb(3_16_42_/_0.72)]',
		);
		expect(screen.getByRole('heading', { name: '프론트엔드 연구소' })).not.toHaveClass('pr-7');
		expect(screen.getByRole('img', { name: '프론트엔드 연구소 커버 이미지' })).toBeInTheDocument();
	});

	it('커버 이미지가 없으면 primary 배경을 사용한다', () => {
		render(<BlogProfileHero profile={{ ...COLOG_PROFILE_FIXTURE, coverImageUrl: null }} />);

		expect(screen.queryByRole('img', { name: '프론트엔드 연구소 커버 이미지' })).not.toBeInTheDocument();
		expect(screen.getByRole('img', { name: '프론트엔드 연구소 팀 로고' }).parentElement?.parentElement).toHaveClass(
			'bg-brand-primary',
			'text-on-brand-primary',
		);
	});

	it('커버 이미지 위 텍스트에 shadow를 적용한다', () => {
		render(<BlogProfileHero profile={COLOG_PROFILE_FIXTURE} />);

		expect(screen.getByRole('heading', { name: '프론트엔드 연구소' })).toHaveClass(
			'drop-shadow-[0_1px_2px_rgb(3_16_42_/_0.72)]',
		);
	});

	it('커버 object key를 S3 URL로 변환하고 완성된 URL은 보존한다', () => {
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://bucket.rilog.test/');
		const { rerender } = render(
			<BlogProfileHero profile={{ ...COLOG_PROFILE_FIXTURE, coverImageUrl: 'rilog/images/cover.png' }} />,
		);

		expect(
			decodeURIComponent(screen.getByRole('img', { name: '프론트엔드 연구소 커버 이미지' }).getAttribute('src') ?? ''),
		).toContain('https://bucket.rilog.test/rilog/images/cover.png');

		rerender(
			<BlogProfileHero profile={{ ...COLOG_PROFILE_FIXTURE, coverImageUrl: 'https://images.rilog.test/cover.png' }} />,
		);
		expect(
			decodeURIComponent(screen.getByRole('img', { name: '프론트엔드 연구소 커버 이미지' }).getAttribute('src') ?? ''),
		).toContain('https://images.rilog.test/cover.png');
	});

	it.each(['', '   '])('커버 값이 %p이면 기본 배경을 사용한다', (coverImageUrl) => {
		render(<BlogProfileHero profile={{ ...COLOG_PROFILE_FIXTURE, coverImageUrl }} />);

		expect(screen.queryByRole('img', { name: '프론트엔드 연구소 커버 이미지' })).not.toBeInTheDocument();
		expect(screen.getByRole('img', { name: '프론트엔드 연구소 팀 로고' }).parentElement?.parentElement).toHaveClass(
			'bg-brand-primary',
		);
	});

	it('커버 이미지 로딩에 실패하면 이미지를 제거하고 기본 배경을 유지한다', () => {
		render(<BlogProfileHero profile={COLOG_PROFILE_FIXTURE} />);

		fireEvent.error(screen.getByRole('img', { name: '프론트엔드 연구소 커버 이미지' }));

		expect(screen.queryByRole('img', { name: '프론트엔드 연구소 커버 이미지' })).not.toBeInTheDocument();
		expect(screen.getByRole('img', { name: '프론트엔드 연구소 팀 로고' }).parentElement?.parentElement).toHaveClass(
			'bg-brand-primary',
		);
	});

	it('선택 프로필 정보가 비어 있으면 관련 링크를 렌더링하지 않는다', () => {
		render(
			<BlogProfileHero
				profile={{
					...COLOG_PROFILE_FIXTURE,
					description: '',
					serviceUrl: '',
					githubUrl: '',
				}}
			/>,
		);

		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('action을 전달하지 않으면 설정 control을 렌더링하지 않는다', () => {
		render(<BlogProfileHero profile={COLOG_PROFILE_FIXTURE} />);

		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('RILOG 프로필에는 개인 블로그에 맞는 avatar 이름을 제공한다', () => {
		render(
			<BlogProfileHero
				profile={{
					...COLOG_PROFILE_FIXTURE,
					type: 'RILOG',
					name: '파라디',
					slug: 'jetproc',
					memberCount: 1,
				}}
			/>,
		);

		expect(screen.getByRole('img', { name: '파라디 개인 블로그 프로필' })).toHaveClass('rounded-full!');
		const heading = screen.getByRole('heading', { name: '파라디' });
		expect(heading).not.toHaveClass('pr-7', 'drop-shadow-[0_1px_2px_rgb(3_16_42_/_0.72)]');
		expect(heading.parentElement?.parentElement?.parentElement).toHaveClass(
			'bg-brand-primary',
			'text-on-brand-primary',
		);
		expect(screen.getByText('사용자 경험을 함께 연구합니다.')).toHaveClass('text-on-brand-primary');
		expect(screen.queryByRole('img', { name: '파라디 커버 이미지' })).not.toBeInTheDocument();
	});
});
