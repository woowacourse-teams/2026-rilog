import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CologCreateForm from './CologCreateForm';

const { backMock } = vi.hoisted(() => ({ backMock: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: backMock }),
}));

describe('CologCreateForm', () => {
	beforeEach(() => {
		backMock.mockClear();
	});

	it('팀 생성에 필요한 입력과 action을 제공한다', () => {
		render(<CologCreateForm />);

		expect(screen.getByRole('img', { name: '팀 로고 미리보기' })).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '팀 커버 이미지 미리보기' })).toBeInTheDocument();
		expect(screen.getByLabelText('팀 로고 변경')).toHaveAttribute('type', 'file');
		expect(screen.getByLabelText('팀 로고 변경')).toBeRequired();
		expect(screen.getByLabelText('커버 이미지 변경')).toHaveAttribute('type', 'file');
		expect(screen.getByLabelText('커버 이미지 변경')).not.toBeRequired();
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toBeRequired();
		expect(screen.getByRole('textbox', { name: '팀 고유 아이디' })).toBeRequired();
		expect(screen.getByRole('textbox', { name: '팀 소개' })).toBeRequired();
		expect(screen.getByRole('group', { name: '소셜 (선택)' })).toHaveAccessibleDescription(
			'링크를 통해 팀을 표현해 보세요.',
		);
		expect(screen.getByRole('textbox', { name: '서비스 링크' })).toHaveAttribute('type', 'url');
		expect(screen.getByRole('textbox', { name: 'GitHub 링크' })).toHaveAttribute('type', 'url');
		expect(screen.getByRole('textbox', { name: '이메일' })).toHaveAttribute('type', 'email');
		expect(screen.getByRole('button', { name: '취소' })).toHaveAttribute('type', 'button');
		expect(screen.getByRole('button', { name: '팀 만들기' })).toHaveAttribute('type', 'submit');
	});

	it('취소하면 브라우저의 이전 경로로 이동한다', async () => {
		const user = userEvent.setup();
		render(<CologCreateForm />);

		await user.click(screen.getByRole('button', { name: '취소' }));

		expect(backMock).toHaveBeenCalledOnce();
	});

	it('팀 소개의 글자 수를 입력에 맞춰 안내한다', async () => {
		const user = userEvent.setup();
		render(<CologCreateForm />);

		const introduction = screen.getByRole('textbox', { name: '팀 소개' });
		await user.type(introduction, '함께 성장하는 개발 팀입니다');

		expect(introduction).toHaveAccessibleDescription('팀을 소개해 보세요. 15 / 80');
	});

	it('팀 이름과 고유 아이디의 입력 규칙을 제공한다', () => {
		render(<CologCreateForm />);

		expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveAttribute('minlength', '2');
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveAttribute('maxlength', '20');
		expect(screen.getByRole('textbox', { name: '팀 고유 아이디' })).toHaveAttribute('pattern', '[a-z0-9-]+');
	});
});
