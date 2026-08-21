import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BaseModal from './BaseModal';

describe('BaseModal', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('open이 false이면 dialog를 열지 않는다', () => {
		const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
		render(
			<BaseModal open={false} accessibility={{ labelledBy: 'closed-modal-title' }} onDismiss={vi.fn()}>
				<p id="closed-modal-title">닫힌 모달</p>
			</BaseModal>,
		);

		expect(showModalSpy).not.toHaveBeenCalled();
		expect(screen.queryByRole('dialog', { name: '닫힌 모달' })).not.toBeInTheDocument();
	});

	it('종료 애니메이션 후 dialog를 닫는다', async () => {
		vi.useFakeTimers();
		const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
		const closeSpy = vi.spyOn(HTMLDialogElement.prototype, 'close');
		const { rerender } = render(
			<BaseModal open accessibility={{ labelledBy: 'test-modal-title' }} onDismiss={vi.fn()}>
				<p id="test-modal-title">테스트 모달</p>
				<p>내용</p>
			</BaseModal>,
		);

		expect(showModalSpy).toHaveBeenCalledOnce();
		const dialog = screen.getByRole('dialog', { name: '테스트 모달' });
		expect(dialog).toHaveAttribute('data-state', 'opening');

		rerender(
			<BaseModal open={false} accessibility={{ labelledBy: 'test-modal-title' }} onDismiss={vi.fn()}>
				<p id="test-modal-title">테스트 모달</p>
				<p>내용</p>
			</BaseModal>,
		);

		expect(closeSpy).not.toHaveBeenCalled();
		await act(() => vi.advanceTimersByTime(119));
		expect(closeSpy).not.toHaveBeenCalled();
		await act(() => vi.advanceTimersByTime(1));
		expect(closeSpy).toHaveBeenCalledOnce();
	});

	it('종료 애니메이션 중 다시 열리면 예약된 close를 취소한다', async () => {
		vi.useFakeTimers();
		const closeSpy = vi.spyOn(HTMLDialogElement.prototype, 'close');
		const { rerender } = render(
			<BaseModal open accessibility={{ labelledBy: 'reopen-modal-title' }} onDismiss={vi.fn()}>
				<p id="reopen-modal-title">다시 여는 모달</p>
			</BaseModal>,
		);
		const dialog = screen.getByRole('dialog', { name: '다시 여는 모달' });

		rerender(
			<BaseModal open={false} accessibility={{ labelledBy: 'reopen-modal-title' }} onDismiss={vi.fn()}>
				<p id="reopen-modal-title">다시 여는 모달</p>
			</BaseModal>,
		);
		await act(() => vi.advanceTimersByTime(60));

		rerender(
			<BaseModal open accessibility={{ labelledBy: 'reopen-modal-title' }} onDismiss={vi.fn()}>
				<p id="reopen-modal-title">다시 여는 모달</p>
			</BaseModal>,
		);
		await act(() => vi.advanceTimersByTime(120));

		expect(closeSpy).not.toHaveBeenCalled();
		expect(dialog).toHaveAttribute('open');
		expect(dialog).toHaveAttribute('data-state', 'open');
	});

	it('children 외의 header, footer, button을 자동으로 만들지 않는다', () => {
		const { container } = render(
			<BaseModal open accessibility={{ labelledBy: 'base-modal-title' }} onDismiss={vi.fn()}>
				<p id="base-modal-title">기본 모달</p>
				<p>전달한 내용</p>
			</BaseModal>,
		);

		expect(screen.getByText('전달한 내용')).toBeInTheDocument();
		expect(container.querySelector('header')).not.toBeInTheDocument();
		expect(container.querySelector('footer')).not.toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('Escape와 backdrop 정책을 각각 적용한다', () => {
		const onDismiss = vi.fn();
		const { rerender } = render(
			<BaseModal
				open
				accessibility={{ labelledBy: 'policy-modal-title' }}
				onDismiss={onDismiss}
				closeOnBackdrop={false}
				closeOnEscape={false}
			>
				<span id="policy-modal-title">정책 모달</span>
				<button type="button">내부 버튼</button>
			</BaseModal>,
		);
		const dialog = screen.getByRole('dialog', { name: '정책 모달' });

		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		fireEvent.click(dialog);
		fireEvent.click(screen.getByRole('button', { name: '내부 버튼' }));
		expect(onDismiss).not.toHaveBeenCalled();

		rerender(
			<BaseModal
				open
				accessibility={{ labelledBy: 'policy-modal-title' }}
				onDismiss={onDismiss}
				closeOnBackdrop
				closeOnEscape
			>
				<span id="policy-modal-title">정책 모달</span>
				<button type="button">내부 버튼</button>
			</BaseModal>,
		);
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onDismiss).toHaveBeenCalledOnce();
		fireEvent.click(dialog);
		expect(onDismiss).toHaveBeenCalledTimes(2);
	});

	it('dismissDisabled이면 backdrop과 Escape를 함께 차단한다', () => {
		const onDismiss = vi.fn();
		const { rerender } = render(
			<BaseModal
				open
				accessibility={{ labelledBy: 'disabled-dismiss-title' }}
				onDismiss={onDismiss}
				closeOnBackdrop
				closeOnEscape
				dismissDisabled
			>
				<span id="disabled-dismiss-title">종료 차단 모달</span>
			</BaseModal>,
		);
		const dialog = screen.getByRole('dialog', { name: '종료 차단 모달' });

		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onDismiss).not.toHaveBeenCalled();

		rerender(
			<BaseModal
				open
				accessibility={{ labelledBy: 'disabled-dismiss-title' }}
				onDismiss={onDismiss}
				closeOnBackdrop
				closeOnEscape
				dismissDisabled={false}
			>
				<span id="disabled-dismiss-title">종료 차단 모달</span>
			</BaseModal>,
		);
		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onDismiss).toHaveBeenCalledTimes(2);
	});

	it('지정한 요소에 초기 focus를 주고 닫힌 뒤 opener에 focus를 복원한다', async () => {
		vi.useFakeTimers();
		const initialFocusRef = createRef<HTMLButtonElement>();
		const openerRef = createRef<HTMLButtonElement>();
		const { rerender } = render(
			<>
				<button ref={openerRef} type="button">
					열기 버튼
				</button>
				<BaseModal
					open={false}
					accessibility={{ labelledBy: 'focus-modal-title' }}
					onDismiss={vi.fn()}
					initialFocusRef={initialFocusRef}
				>
					<span id="focus-modal-title">focus 모달</span>
					<button ref={initialFocusRef} type="button">
						첫 동작
					</button>
				</BaseModal>
			</>,
		);

		openerRef.current?.focus();
		rerender(
			<>
				<button ref={openerRef} type="button">
					열기 버튼
				</button>
				<BaseModal
					open
					accessibility={{ labelledBy: 'focus-modal-title' }}
					onDismiss={vi.fn()}
					initialFocusRef={initialFocusRef}
				>
					<span id="focus-modal-title">focus 모달</span>
					<button ref={initialFocusRef} type="button">
						첫 동작
					</button>
				</BaseModal>
			</>,
		);

		expect(initialFocusRef.current).toHaveFocus();

		rerender(
			<>
				<button ref={openerRef} type="button">
					열기 버튼
				</button>
				<BaseModal
					open={false}
					accessibility={{ labelledBy: 'focus-modal-title' }}
					onDismiss={vi.fn()}
					initialFocusRef={initialFocusRef}
				>
					<span id="focus-modal-title">focus 모달</span>
					<button ref={initialFocusRef} type="button">
						첫 동작
					</button>
				</BaseModal>
			</>,
		);

		await act(() => vi.advanceTimersByTime(120));
		expect(openerRef.current).toHaveFocus();
	});

	it('열린 상태에서 unmount되어도 opener에 focus를 복원한다', () => {
		const initialFocusRef = createRef<HTMLButtonElement>();
		const openerRef = createRef<HTMLButtonElement>();
		const { rerender } = render(
			<>
				<button ref={openerRef} type="button">
					열기 버튼
				</button>
				<BaseModal
					open={false}
					accessibility={{ labelledBy: 'unmount-modal-title' }}
					onDismiss={vi.fn()}
					initialFocusRef={initialFocusRef}
				>
					<span id="unmount-modal-title">unmount 모달</span>
					<button ref={initialFocusRef} type="button">
						내부 동작
					</button>
				</BaseModal>
			</>,
		);

		openerRef.current?.focus();
		rerender(
			<>
				<button ref={openerRef} type="button">
					열기 버튼
				</button>
				<BaseModal
					open
					accessibility={{ labelledBy: 'unmount-modal-title' }}
					onDismiss={vi.fn()}
					initialFocusRef={initialFocusRef}
				>
					<span id="unmount-modal-title">unmount 모달</span>
					<button ref={initialFocusRef} type="button">
						내부 동작
					</button>
				</BaseModal>
			</>,
		);

		expect(initialFocusRef.current).toHaveFocus();
		rerender(
			<button ref={openerRef} type="button">
				열기 버튼
			</button>,
		);
		expect(openerRef.current).toHaveFocus();
	});

	it('alertdialog role과 연결된 accessible name을 전달한다', () => {
		render(
			<BaseModal open accessibility={{ role: 'alertdialog', labelledBy: 'alert-title' }} onDismiss={vi.fn()}>
				<h2 id="alert-title">중요 알림</h2>
			</BaseModal>,
		);

		expect(screen.getByRole('alertdialog', { name: '중요 알림' })).toBeInTheDocument();
	});
});
