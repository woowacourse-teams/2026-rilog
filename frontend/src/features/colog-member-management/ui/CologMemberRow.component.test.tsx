import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CologMember } from '@/domains/blog/model/colog';

import CologMemberRow from './CologMemberRow';

const BASE_MEMBER: CologMember = {
	id: 1,
	nickname: '김지연',
	slug: 'jiyeon',
	profileImageUrl: '',
	permission: 'OWNER',
	blogRole: '회장',
	joinedAt: '2024-05-20T00:00:00.000Z',
};

const renderInTable = (ui: React.ReactElement) =>
	render(
		<table>
			<tbody>{ui}</tbody>
		</table>,
	);

describe('CologMemberRow', () => {
	it('읽기 모드에서는 텍스트 정보를 렌더링한다', () => {
		renderInTable(<CologMemberRow member={BASE_MEMBER} />);

		expect(screen.getByText('김지연')).toBeInTheDocument();
		expect(screen.getByText('@jiyeon')).toBeInTheDocument();
		expect(screen.getByText('Owner')).toBeInTheDocument();
		expect(screen.getByText('2024. 5. 20')).toBeInTheDocument();
	});

	it('편집 모드에서 권한 select를 변경하면 콜백을 호출한다', async () => {
		const user = userEvent.setup();
		const onPermissionChange = vi.fn();

		renderInTable(
			<CologMemberRow
				member={BASE_MEMBER}
				isEditing
				onPermissionChange={onPermissionChange}
				onBlogRoleChange={vi.fn()}
			/>,
		);

		const select = screen.getByRole('combobox', { name: '김지연 권한' });
		await user.selectOptions(select, 'ADMIN');

		expect(onPermissionChange).toHaveBeenCalledWith(1, 'ADMIN');
	});
});
