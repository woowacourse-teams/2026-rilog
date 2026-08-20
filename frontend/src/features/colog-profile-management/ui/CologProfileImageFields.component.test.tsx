import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CologProfileSettingsValue } from '../model/colog-profile-settings';

import CologProfileImageFields from './CologProfileImageFields';

const DEFAULT_VALUE: CologProfileSettingsValue = {
	name: '리로그',
	slug: 'rilog-team',
	description: '',
	profileImageUrl: '',
	coverImageUrl: '',
	serviceUrl: '',
	githubUrl: '',
	logoFile: null,
	coverImageFile: null,
};

describe('CologProfileImageFields', () => {
	it('기본 상태에서는 로고와 커버 이미지 추가 action을 제공한다', () => {
		render(
			<CologProfileImageFields value={DEFAULT_VALUE} onLogoFileChange={vi.fn()} onCoverImageFileChange={vi.fn()} />,
		);

		expect(screen.getByText('팀 로고 추가')).toBeInTheDocument();
		expect(screen.getByText('커버 이미지 추가')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '팀 로고 미리보기' }).parentElement).toHaveClass('rounded-lg');
		expect(screen.getByRole('img', { name: '기본 팀 커버 이미지' })).toBeInTheDocument();
		expect(screen.getByText('커버 이미지 추가').closest('details')).toHaveClass('absolute', 'right-3', 'bottom-3');
	});

	it('선택된 이미지를 기본 이미지로 되돌린다', async () => {
		const user = userEvent.setup();
		const onLogoFileChange = vi.fn();
		const onCoverImageFileChange = vi.fn();
		render(
			<CologProfileImageFields
				value={{ ...DEFAULT_VALUE, profileImageUrl: 'rilog/images/logo.png', coverImageUrl: 'rilog/images/cover.png' }}
				onLogoFileChange={onLogoFileChange}
				onCoverImageFileChange={onCoverImageFileChange}
			/>,
		);

		const logoMenu = screen.getByText('팀 로고 변경').closest('details')!;
		await user.click(screen.getByText('팀 로고 변경'));
		await user.click(within(logoMenu).getByRole('button', { name: '기본 이미지로 되돌리기' }));

		const coverMenu = screen.getByText('커버 이미지 변경').closest('details')!;
		await user.click(screen.getByText('커버 이미지 변경'));
		await user.click(within(coverMenu).getByRole('button', { name: '기본 이미지로 되돌리기' }));

		expect(onLogoFileChange).toHaveBeenCalledWith(null);
		expect(onCoverImageFileChange).toHaveBeenCalledWith(null);
	});
});
