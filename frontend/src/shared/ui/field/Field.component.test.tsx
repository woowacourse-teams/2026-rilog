import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Input from '@/shared/ui/input/Input';
import Textarea from '@/shared/ui/textarea/Textarea';

import Field from './Field';

describe('Field', () => {
	it('label과 description을 text input에 연결한다', () => {
		render(
			<Field label="닉네임" description="닉네임은 2~20자 사이로 입력 가능해요.">
				{({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} />}
			</Field>,
		);

		const input = screen.getByRole('textbox', { name: '닉네임' });
		expect(input).toHaveAccessibleDescription('닉네임은 2~20자 사이로 입력 가능해요.');
	});

	it('textarea를 단일 control로 배치한다', () => {
		render(
			<Field label="한 줄 소개" description="나를 소개하는 문장을 입력하세요.">
				{({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} />}
			</Field>,
		);

		const textarea = screen.getByRole('textbox', { name: '한 줄 소개' });
		expect(textarea.tagName).toBe('TEXTAREA');
		expect(textarea).toHaveAccessibleDescription('나를 소개하는 문장을 입력하세요.');
	});

	it('control에 전달된 기존 description 관계를 유지한다', () => {
		render(
			<>
				<p id="input-guidance">공백 없이 입력해 주세요.</p>
				<Field label="고유 아이디" description="아이디는 4~20자 사이로 입력 가능해요.">
					{({ id, describedBy }) => (
						<Input id={id} aria-describedby={['input-guidance', describedBy].filter(Boolean).join(' ')} />
					)}
				</Field>
			</>,
		);

		expect(screen.getByRole('textbox', { name: '고유 아이디' })).toHaveAccessibleDescription(
			'공백 없이 입력해 주세요. 아이디는 4~20자 사이로 입력 가능해요.',
		);
	});

	it('label 우측에 독립적인 action을 배치한다', () => {
		render(
			<Field label="시리즈" labelAction={<button type="button">새 시리즈 추가</button>}>
				{({ id }) => <select id={id} />}
			</Field>,
		);

		expect(screen.getByRole('combobox', { name: '시리즈' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '새 시리즈 추가' })).toBeInTheDocument();
	});
});
