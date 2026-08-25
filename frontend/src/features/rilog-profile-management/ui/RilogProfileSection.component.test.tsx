import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/shared/constants/image-upload';

import { useRilogProfileManagement } from '../hooks/use-rilog-profile-management';
import { createMockRilogProfile } from '../lib/mock-rilog-profile';

import RilogProfileSection from './RilogProfileSection';

function RilogProfileTestWorkspace() {
	const management = useRilogProfileManagement({ initialProfile: createMockRilogProfile('rilogger') });

	return (
		<>
			<RilogProfileSection management={management} />
			{management.isDirty && (
				<button type="submit" form="rilog-profile-settings-form">
					변경사항 저장
				</button>
			)}
			<output aria-label="저장된 닉네임">{management.savedProfile.nickname}</output>
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
		expect(screen.getByRole('textbox', { name: '소개' })).toHaveValue('기록하고 성장하는 개발자입니다.');
		expect(screen.getByRole('textbox', { name: '서비스 링크' })).toHaveValue('https://rilog.kr');
		expect(screen.getByRole('textbox', { name: 'GitHub 링크' })).toHaveValue('https://github.com/rilog');
		expect(screen.queryByText('커버 이미지')).not.toBeInTheDocument();
	});

	it('닉네임 변경은 현재 정규화 값으로 중복 확인한 뒤에만 목 저장한다', async () => {
		const user = userEvent.setup();
		render(<RilogProfileTestWorkspace />);

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		await user.clear(nickname);
		await user.type(nickname, '  새 리로거  ');
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

		expect(nickname).toHaveFocus();
		expect(nickname).toHaveAccessibleDescription(/닉네임 중복 확인이 필요합니다\./);
		expect(screen.getByRole('button', { name: '변경사항 저장' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
		expect(nickname).toHaveValue('새 리로거');
		expect(nickname).toHaveAccessibleDescription(/사용 가능한 닉네임입니다\./);
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

		expect(screen.getByLabelText('저장된 닉네임')).toHaveTextContent('새 리로거');
		expect(screen.queryByRole('button', { name: '변경사항 저장' })).not.toBeInTheDocument();
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

	it('중복 확인 뒤 닉네임을 다시 변경하면 저장을 막고 입력에 focus한다', async () => {
		const user = userEvent.setup();
		render(<RilogProfileTestWorkspace />);

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		await user.clear(nickname);
		await user.type(nickname, '새 리로거');
		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
		await user.type(nickname, '2');
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

		expect(nickname).toHaveFocus();
		expect(nickname).toHaveAccessibleDescription(/닉네임 중복 확인이 필요합니다\./);
	});

	it('닉네임이 저장값과 같으면 다른 변경은 중복 확인 없이 목 저장한다', async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		render(<RilogProfileTestWorkspace />);

		const description = screen.getByRole('textbox', { name: '소개' });
		await user.clear(description);
		await user.type(description, '새 소개');
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

		expect(screen.queryByRole('button', { name: '변경사항 저장' })).not.toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
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
