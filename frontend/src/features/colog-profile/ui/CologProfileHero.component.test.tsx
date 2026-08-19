import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CologProfile } from '@/domains/blog/model/colog';

import CologProfileHero from './CologProfileHero';

const COLOG_PROFILE_FIXTURE: CologProfile = {
	name: '프론트엔드 연구소',
	slug: 'frontend-lab',
	description: '사용자 경험을 함께 연구합니다.',
	profileImageUrl: '/images/frontend-lab-logo.png',
	coverImageUrl: '/images/frontend-lab-cover.png',
	serviceUrl: 'https://frontend-lab.example.com',
	githubUrl: 'https://github.com/frontend-lab',
	email: 'hello@frontend-lab.example.com',
};

describe('CologHomeHero', () => {
	it('전달받은 코로그 프로필과 외부 연결 경로를 제공한다', () => {
		render(<CologProfileHero profile={COLOG_PROFILE_FIXTURE} />);

		expect(screen.getByRole('heading', { level: 1, name: '프론트엔드 연구소' })).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '프론트엔드 연구소 코로그 로고' })).toBeInTheDocument();
		expect(screen.getByText('사용자 경험을 함께 연구합니다.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'frontend-lab.example.com' })).toHaveAttribute(
			'href',
			'https://frontend-lab.example.com',
		);
		expect(screen.getByRole('link', { name: '프론트엔드 연구소 GitHub' })).toHaveAttribute(
			'href',
			'https://github.com/frontend-lab',
		);
		expect(screen.getByRole('link', { name: '프론트엔드 연구소 이메일' })).toHaveAttribute(
			'href',
			'mailto:hello@frontend-lab.example.com',
		);
		expect(screen.getByRole('button', { name: '프론트엔드 연구소 코로그 메뉴 열기' })).toBeInTheDocument();
	});

	it('선택 프로필 정보가 비어 있으면 관련 링크를 렌더링하지 않는다', () => {
		render(
			<CologProfileHero
				profile={{
					...COLOG_PROFILE_FIXTURE,
					description: '',
					serviceUrl: '',
					githubUrl: '',
					email: '',
				}}
			/>,
		);

		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});
});
