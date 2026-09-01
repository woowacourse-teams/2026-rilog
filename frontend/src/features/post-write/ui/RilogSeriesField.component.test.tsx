import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import * as blogsApi from '@/shared/api/blogs/api';
import { renderWithQuery } from '@/test/render-with-query';

import RilogSeriesField from './RilogSeriesField';

const { refetchChaptersMock, usePostPublishChaptersMock } = vi.hoisted(() => ({
	refetchChaptersMock: vi.fn(),
	usePostPublishChaptersMock: vi.fn(),
}));

vi.mock('@/features/post-write/hooks/use-post-publish-chapters', () => ({
	usePostPublishChapters: usePostPublishChaptersMock,
}));

const DEFAULT_PROPS: ComponentProps<typeof RilogSeriesField> = {
	open: true,
	userSlug: 'personal-blog',
	selectedChapterId: null,
	isDisabled: false,
	onChapterChange: vi.fn(),
};

const renderField = (overrides: Partial<ComponentProps<typeof RilogSeriesField>> = {}) =>
	renderWithQuery(<RilogSeriesField {...DEFAULT_PROPS} {...overrides} />);

describe('RilogSeriesField', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		refetchChaptersMock.mockReset();
		usePostPublishChaptersMock.mockReset();
		usePostPublishChaptersMock.mockReturnValue({
			data: [
				{ value: '7', label: '프론트엔드 성장 기록' },
				{ value: '12', label: '개발' },
			],
			isError: false,
			isPending: false,
			refetch: refetchChaptersMock,
		});
	});

	it('개인 블로그 slug로 시리즈를 조회하고 선택값을 변경한다', async () => {
		const user = userEvent.setup();
		const handleChapterChange = vi.fn();
		renderField({ selectedChapterId: 12, onChapterChange: handleChapterChange });

		const select = screen.getByRole('combobox', { name: '시리즈' });
		expect(select).toHaveDisplayValue('개발');
		expect(within(select).getByRole('option', { name: '프론트엔드 성장 기록' })).toHaveValue('7');
		expect(usePostPublishChaptersMock).toHaveBeenCalledWith({ slug: 'personal-blog', isEnabled: true });

		await user.selectOptions(select, '7');
		expect(handleChapterChange).toHaveBeenCalledWith(7);
	});

	it('개인 블로그 slug가 없으면 조회를 비활성화하고 안내한다', () => {
		renderField({ userSlug: null });

		expect(usePostPublishChaptersMock).toHaveBeenCalledWith({ slug: '', isEnabled: false });
		expect(screen.getByRole('combobox', { name: '시리즈' })).toBeDisabled();
		expect(screen.getByRole('status')).toHaveTextContent('시리즈 목록을 확인할 수 없어요.');
	});

	it('새 시리즈 생성 중 필드를 잠그고 생성한 chapterId를 선택값으로 전달한다', async () => {
		const user = userEvent.setup();
		let resolveCreateChapter!: (response: {
			status: number;
			message: string;
			data: { chapterId: number; name: string; order: number };
		}) => void;
		const createChapter = vi.spyOn(blogsApi, 'createBlogChapter').mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveCreateChapter = resolve;
				}),
		);
		const handleChapterChange = vi.fn();
		renderField({ onChapterChange: handleChapterChange });

		await user.click(screen.getByRole('button', { name: '새 시리즈 추가' }));
		const input = screen.getByRole('textbox', { name: '새로운 시리즈 이름' });
		expect(input).toHaveFocus();
		await user.type(input, '새 시리즈{Enter}');

		await waitFor(() => expect(createChapter).toHaveBeenCalledWith('personal-blog', { name: '새 시리즈' }));
		expect(input).toBeDisabled();
		expect(screen.getByRole('combobox', { name: '시리즈' })).toBeDisabled();

		act(() => {
			resolveCreateChapter({
				status: 201,
				message: '챕터를 생성했습니다.',
				data: { chapterId: 19, name: '새 시리즈', order: 2 },
			});
		});

		await waitFor(() => expect(handleChapterChange).toHaveBeenCalledWith(19));
		expect(screen.queryByRole('textbox', { name: '새로운 시리즈 이름' })).not.toBeInTheDocument();
	});
});
