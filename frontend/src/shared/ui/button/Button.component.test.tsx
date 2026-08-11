import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { SyntheticEvent } from 'react';

import Button from './Button';

describe('Button', () => {
	it('기본적으로 form을 제출하지 않는 button으로 동작한다', async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();
		const handleSubmit = vi.fn((event: SyntheticEvent<HTMLFormElement>) => event.preventDefault());

		render(
			<form onSubmit={handleSubmit}>
				<Button onClick={handleClick}>저장</Button>
			</form>,
		);

		const button = screen.getByRole('button', { name: '저장' });
		expect(button).toHaveAttribute('type', 'button');

		await user.click(button);
		expect(handleClick).toHaveBeenCalledOnce();
		expect(handleSubmit).not.toHaveBeenCalled();
	});

	it('외부 form과 연결된 submit 동작을 전달한다', async () => {
		const user = userEvent.setup();
		const handleSubmit = vi.fn((event: SyntheticEvent<HTMLFormElement>) => event.preventDefault());

		render(
			<>
				<form id="button-test-form" onSubmit={handleSubmit} />
				<Button type="submit" form="button-test-form">
					제출
				</Button>
			</>,
		);

		await user.click(screen.getByRole('button', { name: '제출' }));
		expect(handleSubmit).toHaveBeenCalledOnce();
	});

	it('disabled 상태에서는 action을 막는다', async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();

		render(
			<Button disabled onClick={handleClick}>
				비활성 버튼
			</Button>,
		);

		const button = screen.getByRole('button', { name: '비활성 버튼' });
		expect(button).toBeDisabled();

		await user.click(button);
		expect(handleClick).not.toHaveBeenCalled();
	});

	it('키보드 focus와 Enter로 action을 실행한다', async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();

		render(<Button onClick={handleClick}>저장</Button>);

		const button = screen.getByRole('button', { name: '저장' });
		await user.tab();
		expect(button).toHaveFocus();

		await user.keyboard('{Enter}');
		expect(handleClick).toHaveBeenCalledOnce();
	});

	it('pending 상태에서는 action을 막고 접근 가능한 상태를 제공한다', async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();

		render(
			<Button isPending onClick={handleClick}>
				저장 중
			</Button>,
		);

		const button = screen.getByRole('button', { name: '저장 중' });
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute('aria-busy', 'true');

		await user.click(button);
		expect(handleClick).not.toHaveBeenCalled();
	});

	it('pending submit은 외부 form 제출을 막는다', async () => {
		const user = userEvent.setup();
		const handleSubmit = vi.fn((event: SyntheticEvent<HTMLFormElement>) => event.preventDefault());

		render(
			<>
				<form id="pending-button-test-form" onSubmit={handleSubmit} />
				<Button type="submit" form="pending-button-test-form" isPending>
					제출 중
				</Button>
			</>,
		);

		await user.click(screen.getByRole('button', { name: '제출 중' }));
		expect(handleSubmit).not.toHaveBeenCalled();
	});

	it('ref와 native 접근성 속성을 button에 전달한다', () => {
		const buttonRef = createRef<HTMLButtonElement>();

		render(
			<Button ref={buttonRef} variant="ghost" size="icon" aria-label="닫기">
				<span aria-hidden="true">×</span>
			</Button>,
		);

		const button = screen.getByRole('button', { name: '닫기' });
		expect(buttonRef.current).toBe(button);
	});
});
