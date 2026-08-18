import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CologMemberSummary } from '@/domains/blog/model/colog';

import CologMemberList from './CologMemberList';

const MEMBER_FIXTURES: CologMemberSummary[] = [
	{ id: 1, slug: 'saebom', nickname: '새봄', profileImageUrl: 'https://images.rilog.test/saebom.png' },
	{ id: 2, slug: 'yeoreum', nickname: '여름', profileImageUrl: null },
];

describe('CologMemberList', () => {
	it('전달받은 멤버만 렌더링한다', () => {
		render(<CologMemberList members={MEMBER_FIXTURES} />);

		const memberSection = screen.getByRole('region', { name: 'Members' });
		expect(within(memberSection).getAllByRole('img')).toHaveLength(2);
		expect(within(memberSection).getByRole('img', { name: '여름 프로필' })).toBeInTheDocument();
	});

	it('멤버가 없으면 빈 상태를 제공한다', () => {
		render(<CologMemberList members={[]} />);

		expect(screen.getByText('아직 참여한 멤버가 없습니다.')).toBeInTheDocument();
	});
});
