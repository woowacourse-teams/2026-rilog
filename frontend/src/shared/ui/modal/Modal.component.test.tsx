import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SyntheticEvent } from 'react';

import Modal from './Modal';

describe('Modal', () => {
	it('title과 description을 accessible dialog 정보로 연결한다', () => {
		render(
			<Modal open title="새 팀 만들기" description="팀 정보를 입력해 주세요." onClose={vi.fn()}>
				<p>팀 입력 필드</p>
			</Modal>,
		);

		const dialog = screen.getByRole('dialog', { name: '새 팀 만들기' });
		expect(dialog).toHaveAccessibleDescription('팀 정보를 입력해 주세요.');
		expect(screen.getByRole('heading', { name: '새 팀 만들기' })).toBeInTheDocument();
	});

	it('description과 action이 없으면 빈 영역을 만들지 않는다', () => {
		const { container } = render(<Modal open title="간단한 모달" onClose={vi.fn()} />);

		expect(screen.getByRole('dialog', { name: '간단한 모달' })).not.toHaveAttribute('aria-describedby');
		expect(container.querySelector('footer')).not.toBeInTheDocument();
	});

	it('null로 전달한 선택 영역도 렌더링하지 않는다', () => {
		const { container } = render(
			<Modal open title="null 영역 테스트" description={null} footer={null} onClose={vi.fn()}>
				{null}
			</Modal>,
		);

		const dialog = screen.getByRole('dialog', { name: 'null 영역 테스트' });
		expect(dialog).not.toHaveAttribute('aria-describedby');
		expect(container.querySelector('header p')).not.toBeInTheDocument();
		expect(container.querySelector('header + div')).not.toBeInTheDocument();
		expect(container.querySelector('footer')).not.toBeInTheDocument();
	});

	it('X 버튼을 선택적으로 표시하고 닫기 callback을 실행한다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const { rerender } = render(<Modal open title="닫기 테스트" onClose={onClose} />);

		await user.click(screen.getByRole('button', { name: '모달 닫기' }));
		expect(onClose).toHaveBeenCalledOnce();

		rerender(<Modal open title="닫기 테스트" onClose={onClose} showCloseButton={false} />);
		expect(screen.queryByRole('button', { name: '모달 닫기' })).not.toBeInTheDocument();
	});

	it('cancel은 닫고 primary callback은 자동으로 닫지 않는다', async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();
		const onPrimary = vi.fn();
		const onClose = vi.fn();
		render(
			<Modal
				open
				title="action 테스트"
				onClose={onClose}
				cancelAction={{ label: '돌아가기', onClick: onCancel }}
				primaryAction={{ label: '저장', onClick: onPrimary }}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '저장' }));
		expect(onPrimary).toHaveBeenCalledOnce();
		expect(onClose).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: '돌아가기' }));
		expect(onCancel).toHaveBeenCalledOnce();
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('외부 footer의 submit action을 native form에 연결한다', async () => {
		const user = userEvent.setup();
		const handleSubmit = vi.fn((event: SyntheticEvent<HTMLFormElement>) => event.preventDefault());
		const onClose = vi.fn();
		render(
			<Modal
				open
				title="form 테스트"
				onClose={onClose}
				primaryAction={{ type: 'submit', form: 'modal-form', label: '제출' }}
			>
				<form id="modal-form" onSubmit={handleSubmit}>
					<label htmlFor="team-name">팀 이름</label>
					<input id="team-name" name="teamName" />
				</form>
			</Modal>,
		);

		await user.click(screen.getByRole('button', { name: '제출' }));
		expect(handleSubmit).toHaveBeenCalledOnce();
		expect(onClose).not.toHaveBeenCalled();

		await user.type(screen.getByRole('textbox', { name: '팀 이름' }), '{Enter}');
		expect(handleSubmit).toHaveBeenCalledTimes(2);
		expect(onClose).not.toHaveBeenCalled();
	});

	it('custom footer를 기본 action 대신 우측 footer 영역에 렌더링한다', () => {
		const { container } = render(
			<Modal open title="footer 테스트" onClose={vi.fn()} footer={<button type="button">직접 만든 action</button>}>
				<p>내용</p>
			</Modal>,
		);

		const customAction = screen.getByRole('button', { name: '직접 만든 action' });
		expect(customAction.closest('footer')).toBe(container.querySelector('footer'));
		expect(screen.queryByRole('button', { name: '취소' })).not.toBeInTheDocument();
	});

	it('backdrop과 Escape는 기본적으로 닫는다', () => {
		const onClose = vi.fn();
		render(<Modal open title="dismiss 테스트" onClose={onClose} />);
		const dialog = screen.getByRole('dialog', { name: 'dismiss 테스트' });

		fireEvent.click(dialog);
		expect(onClose).toHaveBeenCalledOnce();
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it('primary action pending 중 모든 기본 action과 dismiss를 차단하고 pending 해제 후 복원한다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onCancel = vi.fn();
		const onPrimary = vi.fn();
		const { rerender } = render(
			<Modal
				open
				title="처리 중"
				isPending
				onClose={onClose}
				cancelAction={{ onClick: onCancel }}
				primaryAction={{ label: '저장', onClick: onPrimary }}
			/>,
		);
		const dialog = screen.getByRole('dialog', { name: '처리 중' });

		expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '모달 닫기' })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: '저장' }));
		await user.click(screen.getByRole('button', { name: '취소' }));
		await user.click(screen.getByRole('button', { name: '모달 닫기' }));
		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onPrimary).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();

		rerender(
			<Modal
				open
				title="처리 중"
				isPending={false}
				onClose={onClose}
				cancelAction={{ onClick: onCancel }}
				primaryAction={{ label: '저장', onClick: onPrimary }}
			/>,
		);

		expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
		expect(screen.getByRole('button', { name: '취소' })).toBeEnabled();
		expect(screen.getByRole('button', { name: '모달 닫기' })).toBeEnabled();
		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it('primary action disabled는 dismiss를 차단하지 않는다', () => {
		const onClose = vi.fn();
		render(
			<Modal
				open
				title="입력 대기"
				onClose={onClose}
				primaryAction={{ label: '저장', disabled: true, onClick: vi.fn() }}
			/>,
		);
		const dialog = screen.getByRole('dialog', { name: '입력 대기' });

		expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onClose).toHaveBeenCalledTimes(2);
	});
});
