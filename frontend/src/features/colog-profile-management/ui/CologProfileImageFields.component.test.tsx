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

		expect(screen.getByText('팀 로고 추가')).toBeInTheDocument();
		expect(screen.getByText('커버 이미지 추가')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '팀 로고 미리보기' })).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '기본 팀 커버 이미지' })).toBeInTheDocument();
		expect(screen.getByLabelText('팀 로고 추가')).toHaveAccessibleDescription(
			'로고 이미지는 360*360px(1:1) 사이즈를 권장해요. 10MB 이하의 파일만 업로드 가능해요.',
		);
		expect(screen.getByLabelText('커버 이미지 추가')).toHaveAccessibleDescription(
			'커버 이미지는 3072*1024px(3:1) 사이즈를 권장해요. 10MB 이하의 파일만 업로드 가능해요.',
		);
		expect(screen.queryByRole('button', { name: /기본 이미지로 되돌리기/ })).not.toBeInTheDocument();
	});

	it('이미지 hover overlay의 중앙 action으로 기본 이미지로 되돌린다', async () => {
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

		expect(screen.getByText('팀 로고 변경')).toBeInTheDocument();
		expect(screen.getByText('커버 이미지 변경')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '팀 로고 기본 이미지로 되돌리기' }));
		await user.click(screen.getByRole('button', { name: '커버 이미지 기본 이미지로 되돌리기' }));

		expect(onLogoFileChange).toHaveBeenCalledWith(null);
		expect(onCoverImageFileChange).toHaveBeenCalledWith(null);
	});

	it('10MB를 초과한 이미지는 반영하지 않고 각 입력에 오류를 안내한다', async () => {
		const user = userEvent.setup();
		const onLogoFileChange = vi.fn();
		const onCoverImageFileChange = vi.fn();
		const oversizedImage = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'oversized.png', {
			type: 'image/png',
		});
		const validImage = new File(['valid'], 'valid.png', { type: 'image/png' });
		render(
			<CologProfileImageFields
				value={DEFAULT_VALUE}
				onLogoFileChange={onLogoFileChange}
				onCoverImageFileChange={onCoverImageFileChange}
			/>,
		);

		const logoInput = screen.getByLabelText('팀 로고 추가');
		const coverInput = screen.getByLabelText('커버 이미지 추가');
		await user.upload(logoInput, oversizedImage);
		await user.upload(coverInput, oversizedImage);

		expect(onLogoFileChange).not.toHaveBeenCalled();
		expect(onCoverImageFileChange).not.toHaveBeenCalled();
		expect(logoInput).toBeInvalid();
		expect(coverInput).toBeInvalid();
		expect(logoInput).toHaveAccessibleDescription(/팀 로고는 10MB 이하의 이미지만 업로드할 수 있어요\./);
		expect(coverInput).toHaveAccessibleDescription(/커버 이미지는 10MB 이하의 이미지만 업로드할 수 있어요\./);
		const logoError = screen.getByText('팀 로고는 10MB 이하의 이미지만 업로드할 수 있어요.');
		const coverError = screen.getByText('커버 이미지는 10MB 이하의 이미지만 업로드할 수 있어요.');
		expect(logoError.previousElementSibling).toContainElement(screen.getByRole('img', { name: '팀 로고 미리보기' }));
		expect(logoError.previousElementSibling).toContainElement(logoInput);
		expect(coverError.previousElementSibling).toContainElement(
			screen.getByRole('img', { name: '기본 팀 커버 이미지' }),
		);
		expect(coverError.previousElementSibling).toContainElement(coverInput);

		await user.upload(logoInput, validImage);

		expect(onLogoFileChange).toHaveBeenCalledWith(validImage);
		expect(logoInput).not.toBeInvalid();
		expect(logoInput).not.toHaveAccessibleDescription(/팀 로고는 10MB 이하의 이미지만 업로드할 수 있어요\./);
	});
});
