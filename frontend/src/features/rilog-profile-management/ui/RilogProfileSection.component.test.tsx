import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/shared/constants/image-upload';

import { useRilogProfileForm } from '../hooks/use-rilog-profile-form';

import RilogProfileSection from './RilogProfileSection';

const initialProfile = {
	nickname: '리로거',
	slug: 'rilogger',
	description: '기록하고 성장하는 개발자입니다.',
	profileImageUrl: '',
	serviceUrl: 'https://rilog.kr',
	githubUrl: 'https://github.com/rilog',
	profileImageFile: null,
};

function RilogProfileTestWorkspace() {
	const form = useRilogProfileForm({ initialValue: initialProfile });

	return (
		<>
			<RilogProfileSection
				form={form}
				onSubmit={(event) => {
					event.preventDefault();
					form.validate();
				}}
				onNicknameAvailabilityCheck={() => form.validateNickname()}
			/>
			<button type="submit" form="profile-settings-form">
				변경사항 저장
			</button>
		</>
	);
}

describe('RilogProfileSection', () => {
	it('개인 프로필의 확정된 여섯 필드만 제공하고 커버 이미지는 렌더링하지 않는다', () => {
		render(<RilogProfileTestWorkspace />);

		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '닉네임' })).toHaveValue('리로거');
		expect(screen.getByRole('textbox', { name: '고유 아이디' })).toHaveValue('rilogger');
		expect(screen.getByRole('textbox', { name: '고유 아이디' })).toBeDisabled();
		expect(screen.getByRole('textbox', { name: '한 줄 소개' })).toHaveValue('기록하고 성장하는 개발자입니다.');
		expect(screen.getByRole('textbox', { name: '서비스 링크' })).toHaveValue('https://rilog.kr');
		expect(screen.getByRole('textbox', { name: 'GitHub 링크' })).toHaveValue('https://github.com/rilog');
		expect(screen.queryByText('커버 이미지')).not.toBeInTheDocument();
	});

	it('유효성 오류가 있으면 첫 오류 입력에 focus한다', async () => {
		const user = userEvent.setup();
		render(<RilogProfileTestWorkspace />);

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		await user.clear(nickname);
		await user.type(nickname, '리');
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

		expect(nickname).toHaveFocus();
		expect(nickname).toHaveAccessibleDescription(/닉네임은 2~20자로 입력해 주세요\./);
	});

	it('10MB를 초과한 프로필 이미지는 반영하지 않고 오류를 안내한다', async () => {
		const user = userEvent.setup();
		render(<RilogProfileTestWorkspace />);

		const imageInput = screen.getByLabelText('프로필 이미지 추가');
		const oversizedImage = new File([new Uint8Array(MAX_IMAGE_FILE_SIZE_BYTES + 1)], 'oversized.png', {
			type: 'image/png',
		});
		await user.upload(imageInput, oversizedImage);

		expect(imageInput).toHaveAttribute('aria-invalid', 'true');
		expect(imageInput).toHaveAccessibleDescription(/프로필 이미지는 10MB 이하의 이미지만 업로드할 수 있어요\./);
		expect(screen.getByRole('alert')).toHaveTextContent('프로필 이미지는 10MB 이하의 이미지만 업로드할 수 있어요.');
	});
});
