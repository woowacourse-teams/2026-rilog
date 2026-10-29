import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { SyntheticEvent } from 'react';

import BaseModal from './BaseModal';
import ConfirmModal from './ConfirmModal';
import Modal from './Modal';

describe('Modal', () => {
	it('닫는 도중 다시 열면 닫기 예약을 취소하고 열린 상태로 복구한다', async () => {
		const ui = (open: boolean) => (
			<BaseModal open={open} onDismiss={vi.fn()} exitDurationMs={240} accessibility={{ labelledBy: 'reopen-title' }}>
				<h2 id="reopen-title">빠른 재진입</h2>
			</BaseModal>
		);
		const { rerender } = render(ui(true));
		const dialog = screen.getByRole('dialog', { name: '빠른 재진입' });
		await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'open'));
		rerender(ui(false));
		expect(dialog).toHaveAttribute('data-state', 'closing');
		rerender(ui(true));
		expect(dialog).toHaveAttribute('data-state', 'open');
		expect(dialog).toHaveAttribute('open');
		rerender(ui(false));
		await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
	});

	it('열린 모달의 초기 포커스 참조가 바뀌어도 다시 열거나 포커스를 빼앗지 않는다', async () => {
		const first = createRef<HTMLInputElement>();
		const second = createRef<HTMLInputElement>();
		const ui = (open: boolean, target: 'first' | 'second') => (
			<BaseModal
				open={open}
				onDismiss={vi.fn()}
				accessibility={{ labelledBy: 'focus-modal-title' }}
				initialFocusRef={target === 'first' ? first : second}
			>
				<h2 id="focus-modal-title">포커스 모달</h2>
				<input ref={first} aria-label="첫 입력" />
				<input ref={second} aria-label="둘째 입력" />
			</BaseModal>
		);
		const { rerender } = render(ui(true, 'first'));
		const dialog = screen.getByRole('dialog', { name: '포커스 모달' });
		await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'open'));
		expect(screen.getByRole('textbox', { name: '첫 입력' })).toHaveFocus();
		rerender(ui(true, 'second'));
		expect(dialog).toHaveAttribute('data-state', 'open');
		expect(screen.getByRole('textbox', { name: '첫 입력' })).toHaveFocus();
		rerender(ui(false, 'first'));
		rerender(ui(false, 'second'));
		await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
	});

	it('열린 모달을 제거하면 ref가 해제돼도 실제 dialog를 닫는다', () => {
		const { unmount } = render(
			<StrictMode>
				<BaseModal open onDismiss={vi.fn()} accessibility={{ labelledBy: 'unmount-title' }}>
					<h2 id="unmount-title">제거 모달</h2>
				</BaseModal>
			</StrictMode>,
		);
		const dialog = screen.getByRole('dialog', { name: '제거 모달' });
		unmount();
		expect(dialog).not.toHaveAttribute('open');
	});

	it('Strict Mode에서 열린 채 마운트된 모달도 닫으면 native dialog 잠금을 해제한다', async () => {
		const props = { accessibility: { labelledBy: 'strict-modal-title' }, onDismiss: vi.fn() };
		const { rerender } = render(
			<StrictMode>
				<BaseModal {...props} open>
					<h2 id="strict-modal-title">열린 모달</h2>
				</BaseModal>
			</StrictMode>,
		);
		const dialog = screen.getByRole('dialog', { name: '열린 모달' });
		expect(dialog).toHaveAttribute('open');
		rerender(
			<StrictMode>
				<BaseModal {...props} open={false}>
					<h2 id="strict-modal-title">열린 모달</h2>
				</BaseModal>
			</StrictMode>,
		);
		await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
	});

	it('중첩 확인창에서 Escape로 취소해도 부모 댓글창의 닫기를 요청하지 않는다', async () => {
		const closeComments = vi.fn();
		const cancelDelete = vi.fn();
		render(
			<BaseModal open historyManaged onDismiss={closeComments} accessibility={{ labelledBy: 'comments-title' }}>
				<h2 id="comments-title">댓글</h2>
				<ConfirmModal open title="댓글 삭제" onConfirm={vi.fn()} onCancel={cancelDelete} />
			</BaseModal>,
		);

		await userEvent.keyboard('{Escape}');
		expect(closeComments).not.toHaveBeenCalled();
		fireEvent(screen.getByRole('dialog', { name: '댓글 삭제' }), new Event('cancel', { cancelable: true }));
		expect(cancelDelete).toHaveBeenCalledOnce();
		expect(closeComments).not.toHaveBeenCalled();
	});

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

	it.each([false, true])('중첩 모달의 Escape는 pending=%s에서 부모를 닫지 않는다', (isPending) => {
		const onParentClose = vi.fn();
		const onChildClose = vi.fn();
		render(
			<Modal open title="부모 댓글창" onClose={onParentClose}>
				<Modal open title="댓글 삭제 확인" isPending={isPending} onClose={onChildClose} />
			</Modal>,
		);

		const child = screen.getByRole('dialog', { name: '댓글 삭제 확인' });
		fireEvent(child, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onChildClose).toHaveBeenCalledTimes(isPending ? 0 : 1);
		expect(onParentClose).not.toHaveBeenCalled();

		fireEvent(
			screen.getByRole('dialog', { name: '부모 댓글창' }),
			new Event('cancel', { bubbles: false, cancelable: true }),
		);
		expect(onParentClose).toHaveBeenCalledOnce();
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
