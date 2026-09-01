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
		renderInTable(<CologMemberRow member={{ ...BASE_MEMBER, joinedAt: '2024-05-19T23:30:00' }} />);

		expect(screen.getByText('김지연')).toBeInTheDocument();
		expect(screen.getByText('@jiyeon')).toBeInTheDocument();
		expect(screen.getByText('Owner')).toBeInTheDocument();
		expect(screen.getByText('2024. 5. 20')).toBeInTheDocument();
	});

	it('가입일이 잘못된 문자열이면 원문을 보존한다', () => {
		renderInTable(<CologMemberRow member={{ ...BASE_MEMBER, joinedAt: '알 수 없음' }} />);

		expect(screen.getByText('알 수 없음')).toBeInTheDocument();
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

	it('읽기 모드에서 내보내기 버튼을 누르면 콜백을 호출한다', async () => {
		const user = userEvent.setup();
		const onRemove = vi.fn();

		renderInTable(<CologMemberRow member={BASE_MEMBER} canRemove onRemove={onRemove} />);
		await user.click(screen.getByRole('button', { name: '김지연 멤버 내보내기' }));

		expect(onRemove).toHaveBeenCalledOnce();
	});

	it('내보낼 수 없는 멤버에게는 내보내기 버튼을 표시하지 않는다', () => {
		renderInTable(<CologMemberRow member={BASE_MEMBER} />);

		expect(screen.queryByRole('button', { name: '김지연 멤버 내보내기' })).not.toBeInTheDocument();
	});

	it('편집 모드에서는 내보내기 버튼을 표시하지 않는다', () => {
		renderInTable(<CologMemberRow member={BASE_MEMBER} isEditing canRemove />);

		expect(screen.queryByRole('button', { name: '김지연 멤버 내보내기' })).not.toBeInTheDocument();
	});
});
