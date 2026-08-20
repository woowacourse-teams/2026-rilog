import { render, screen } from '@testing-library/react';
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

		expect(screen.getByLabelText('팀 로고 추가')).toHaveAttribute('type', 'file');
		expect(screen.getByLabelText('커버 이미지 추가')).toHaveAttribute('type', 'file');
		expect(screen.getByRole('img', { name: '기본 팀 커버 이미지' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '기본 이미지로 되돌리기' })).not.toBeInTheDocument();
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

		expect(screen.getByLabelText('팀 로고 변경')).toBeInTheDocument();
		expect(screen.getByLabelText('커버 이미지 변경')).toBeInTheDocument();
		const resetButtons = screen.getAllByRole('button', { name: '기본 이미지로 되돌리기' });
		await user.click(resetButtons[0]!);
		await user.click(resetButtons[1]!);

		expect(onLogoFileChange).toHaveBeenCalledWith(null);
		expect(onCoverImageFileChange).toHaveBeenCalledWith(null);
	});
});
