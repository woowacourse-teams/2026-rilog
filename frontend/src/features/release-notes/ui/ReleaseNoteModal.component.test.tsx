import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import type * as ReleaseNotesModule from '../model/release-notes';

import { RELEASE_NOTE_STORAGE_KEY } from '../model/release-note-storage';

import ReleaseNoteModal from './ReleaseNoteModal';

const notes = vi.hoisted(() => [] as ReleaseNotesModule.ReleaseNote[]);

vi.mock('../model/release-notes', async (importOriginal) => ({
	...(await importOriginal<typeof ReleaseNotesModule>()),
	RELEASE_NOTES: notes,
}));
const note = {
	id: 'release-1',
	title: '업데이트 안내',
	publishedAt: '2026-09-05',
	items: [{ title: '개선 사항', description: '첫째 줄\n둘째 줄' }],
	links: [{ label: '업데이트 자세히 보기', href: 'https://example.com/release-notes' }],
};

beforeEach(() => {
	sessionStorage.clear();
	localStorage.clear();
	notes.splice(0, notes.length, note);
});
afterEach(() => vi.restoreAllMocks());

async function expectClosed() {
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('업데이트 안내', () => {
	it('빈 목록은 모달을 만들지 않는다', () => {
		notes.length = 0;
		render(<ReleaseNoteModal />);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
	it('첫 진입은 제목, 날짜, 항목을 표시하고 닫기에 포커스를 둔다', () => {
		render(<ReleaseNoteModal />);
		expect(screen.getByRole('dialog', { name: note.title })).toBeVisible();
		expect(screen.getByText(note.publishedAt)).toBeVisible();
		expect(screen.getByRole('heading', { name: '개선 사항' })).toBeVisible();
		expect(screen.getByText('첫째 줄 둘째 줄')).toBeVisible();
		expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus();
	});
	it('관련 외부 링크를 새 탭으로 안전하게 연다', () => {
		render(<ReleaseNoteModal />);
		const link = screen.getByRole('link', { name: '업데이트 자세히 보기' });
		expect(link).toHaveAttribute('href', 'https://example.com/release-notes');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});
	it('관련 링크가 없으면 링크 영역을 표시하지 않는다', () => {
		notes[0] = { ...note, links: undefined };
		render(<ReleaseNoteModal />);
		expect(screen.queryByRole('navigation', { name: '업데이트 관련 링크' })).not.toBeInTheDocument();
	});
	it.each(['닫기', '모달 닫기'])('%s는 세션에만 기록하고 같은 탭 재진입에서 숨긴다', async (name) => {
		const view = render(<ReleaseNoteModal />);
		await userEvent.click(screen.getByRole('button', { name }));
		await expectClosed();
		expect(sessionStorage.getItem(RELEASE_NOTE_STORAGE_KEY)).toBe(note.id);
		expect(localStorage.getItem(RELEASE_NOTE_STORAGE_KEY)).toBeNull();
		view.unmount();
		render(<ReleaseNoteModal />);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
	it('영구 숨김은 새 세션에서도 숨기고 새 업데이트 ID는 표시한다', async () => {
		const view = render(<ReleaseNoteModal />);
		await userEvent.click(screen.getByRole('button', { name: '이 업데이트 다시 보지 않기' }));
		await expectClosed();
		expect(localStorage.getItem(RELEASE_NOTE_STORAGE_KEY)).toBe(note.id);
		view.unmount();
		sessionStorage.clear();
		const nextView = render(<ReleaseNoteModal />);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		notes[0] = { ...note, id: 'release-2' };
		nextView.rerender(<ReleaseNoteModal />);
		expect(screen.getByRole('dialog')).toBeVisible();
	});
	it('세션에서 닫은 뒤에도 새 ID는 표시한다', async () => {
		const view = render(<ReleaseNoteModal />);
		await userEvent.click(screen.getByRole('button', { name: '닫기' }));
		await expectClosed();
		notes[0] = { ...note, id: 'release-2' };
		view.rerender(<ReleaseNoteModal />);
		expect(screen.getByRole('dialog')).toBeVisible();
	});
	it('바깥 영역과 ESC는 닫기나 저장을 유발하지 않는다', () => {
		const save = vi.spyOn(Storage.prototype, 'setItem');
		render(<ReleaseNoteModal />);
		const dialog = screen.getByRole('dialog');
		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { cancelable: true }));
		expect(dialog).toBeVisible();
		expect(save).not.toHaveBeenCalled();
	});
	it.each(['닫기', '모달 닫기', '이 업데이트 다시 보지 않기'])(
		'읽기와 쓰기가 실패해도 %s는 현재 마운트 동안 닫는다',
		async (name) => {
			vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
				throw new Error('blocked');
			});
			vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new Error('quota');
			});
			const view = render(<ReleaseNoteModal />);
			await userEvent.click(screen.getByRole('button', { name }));
			await expectClosed();
			view.rerender(<ReleaseNoteModal />);
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			view.unmount();
			render(<ReleaseNoteModal />);
			expect(screen.getByRole('dialog')).toBeVisible();
		},
	);
	it('sessionStorage 접근 자체가 실패해도 localStorage 숨김을 적용한다', () => {
		localStorage.setItem(RELEASE_NOTE_STORAGE_KEY, note.id);
		vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
			throw new Error('denied');
		});
		render(<ReleaseNoteModal />);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
});
