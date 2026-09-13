import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import { renderWithQuery } from '@/test/render-with-query';

import CologChapterField from './CologChapterField';

const DEFAULT_PROPS: ComponentProps<typeof CologChapterField> = {
	chapters: null,
	selectedChapterId: null,
	isDisabled: false,
	onChapterChange: vi.fn(),
};

const renderField = (overrides: Partial<ComponentProps<typeof CologChapterField>> = {}) =>
	renderWithQuery(<CologChapterField {...DEFAULT_PROPS} {...overrides} />);

describe('CologChapterField', () => {
	it('코로그를 선택하기 전에는 챕터 select를 잠그고 안내한다', () => {
		renderField();

		expect(screen.getByRole('combobox', { name: '챕터' })).toBeDisabled();
		expect(screen.getByRole('status')).toHaveTextContent('Colog를 선택하면 챕터 목록을 확인할 수 있어요.');
	});

	it('전달받은 코로그 챕터를 즉시 표시하고 선택값을 변경한다', async () => {
		const user = userEvent.setup();
		const handleChapterChange = vi.fn();
		renderField({
			chapters: [
				{ value: '3', label: '프론트엔드' },
				{ value: '5', label: '백엔드' },
			],
			selectedChapterId: 5,
			onChapterChange: handleChapterChange,
		});

		const select = screen.getByRole('combobox', { name: '챕터' });
		expect(select).toHaveDisplayValue('백엔드');
		expect(within(select).getByRole('option', { name: '프론트엔드' })).toHaveValue('3');

		await user.selectOptions(select, '3');
		expect(handleChapterChange).toHaveBeenLastCalledWith(3);
		await user.selectOptions(select, '');
		expect(handleChapterChange).toHaveBeenLastCalledWith(null);
	});

	it('선택한 코로그가 바뀌면 별도 loading 상태 없이 새 챕터 목록을 표시한다', () => {
		const { rerender } = renderField({
			chapters: [{ value: '3', label: '프론트엔드' }],
		});

		rerender(<CologChapterField {...DEFAULT_PROPS} chapters={[{ value: '9', label: '프로덕트' }]} />);

		const select = screen.getByRole('combobox', { name: '챕터' });
		expect(within(select).queryByRole('option', { name: '프론트엔드' })).not.toBeInTheDocument();
		expect(within(select).getByRole('option', { name: '프로덕트' })).toBeInTheDocument();
		expect(screen.queryByText('챕터 목록을 불러오는 중...')).not.toBeInTheDocument();
	});
});
