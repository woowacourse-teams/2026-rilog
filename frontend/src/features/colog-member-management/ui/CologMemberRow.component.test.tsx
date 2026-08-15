import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CologMember } from '@/domains/colog/model/colog-member';

import CologMemberRow from './CologMemberRow';

const MEMBER: CologMember = {
	id: 1,
	userId: 101,
	nickname: '김지연',
	slug: 'jiyeon',
	profileImageUrl: 'https://example.com/profile.png',
	permission: 'OWNER',
	blogRole: '회장',
	joinedAt: '2024-05-20T00:00:00.000Z',
};

describe('CologMemberRow', () => {
	it('멤버 정보와 접근 가능한 내보내기 동작을 제공한다', () => {
		render(
			<table>
				<tbody>
					<CologMemberRow member={MEMBER} />
				</tbody>
			</table>,
		);

		const row = screen.getByRole('row');

		expect(row).toHaveTextContent('김지연');
		expect(row).toHaveTextContent('@jiyeon');
		expect(row).toHaveTextContent('회장');
		expect(row).toHaveTextContent('Owner');
		expect(row).toHaveTextContent('2024. 5. 20');
		expect(screen.getByRole('img', { name: '김지연 프로필 이미지' }).querySelector('img')).toHaveAttribute(
			'src',
			MEMBER.profileImageUrl,
		);
		expect(screen.getByRole('button', { name: '김지연 멤버 내보내기' })).toBeInTheDocument();
	});

	it('API 권한 값을 화면용 레이블로 표시한다', () => {
		render(
			<table>
				<tbody>
					<CologMemberRow member={{ ...MEMBER, permission: 'ADMIN' }} />
				</tbody>
			</table>,
		);

		expect(screen.getByRole('row')).toHaveTextContent('Admin');
	});
});
