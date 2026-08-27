import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DraftListModal from './DraftListModal';

const { recordEditorEntryContextMock } = vi.hoisted(() => ({
	recordEditorEntryContextMock: vi.fn(),
}));

vi.mock('@/features/analytics/lib/editor-entry-context', () => ({
	recordEditorEntryContext: recordEditorEntryContextMock,
}));

const DRAFT = { id: 42, title: '임시저장 글', savedAt: '2026-08-21T04:40:07.585624' };

describe('DraftListModal', () => {
	beforeEach(() => recordEditorEntryContextMock.mockReset());

	it('선택 기능이 없으면 draft 진입과 분석 컨텍스트를 비활성화한다', () => {
		render(<DraftListModal open draftPosts={[DRAFT]} onClose={vi.fn()} onDelete={vi.fn()} />);

		expect(screen.getByRole('button', { name: /^임시저장 글2026년/ })).toBeDisabled();
		expect(recordEditorEntryContextMock).not.toHaveBeenCalled();
	});

	it('활성화된 draft를 선택하기 직전에 진입 컨텍스트를 기록한다', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(<DraftListModal open draftPosts={[DRAFT]} onClose={vi.fn()} onDelete={vi.fn()} onSelect={onSelect} />);

		await user.click(screen.getByRole('button', { name: /^임시저장 글2026년/ }));

		expect(recordEditorEntryContextMock).toHaveBeenCalledWith('draft_list');
		expect(onSelect).toHaveBeenCalledWith(42);
	});
});
