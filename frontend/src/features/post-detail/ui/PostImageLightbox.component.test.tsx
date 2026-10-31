import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import PostDetailContent from './PostDetailContent';

const IMAGE_HTML =
	'<div class="bn-block-content"><img src="https://example.com/a.png" alt="첫 이미지" /><img src="https://example.com/b.png" alt="둘째 이미지" /><img src="https://example.com/c.png" alt="셋째 이미지" /></div>';

const renderContent = () =>
	render(<PostDetailContent html={IMAGE_HTML} postId={1} ownerType="RILOG" category="TECH" />);

describe('PostImageLightbox', () => {
	it('본문 이미지를 클릭하면 확대 이미지를 보여준다', async () => {
		renderContent();

		await userEvent.click(screen.getByRole('img', { name: '첫 이미지', hidden: true }));

		expect(await screen.findAllByRole('img', { name: '첫 이미지' })).toHaveLength(2);
		expect(screen.getByRole('button', { name: '이미지 닫기' })).toBeInTheDocument();
	});

	it('전체 이미지 개수와 현재 이미지의 위치를 보여준다', async () => {
		renderContent();

		await userEvent.click(screen.getByRole('img', { name: '둘째 이미지', hidden: true }));

		expect(await screen.findByText('2 / 3')).toBeInTheDocument();
	});

	it('좌우 버튼으로 이전 및 다음 이미지를 탐색한다', async () => {
		renderContent();

		await userEvent.click(screen.getByRole('img', { name: '첫 이미지', hidden: true }));

		const prevButton = await screen.findByRole('button', { name: '이전 이미지' });
		const nextButton = screen.getByRole('button', { name: '다음 이미지' });
		expect(prevButton).toBeDisabled();
		expect(nextButton).toBeEnabled();

		await userEvent.click(nextButton);
		expect(screen.getByText('2 / 3')).toBeInTheDocument();
		expect(screen.getAllByRole('img', { name: '둘째 이미지' })).toHaveLength(2);
		expect(prevButton).toBeEnabled();

		await userEvent.click(nextButton);
		expect(screen.getByText('3 / 3')).toBeInTheDocument();
		expect(nextButton).toBeDisabled();

		await userEvent.click(prevButton);
		expect(screen.getByText('2 / 3')).toBeInTheDocument();
	});

	it('좌우 스와이프로 연속해서 이미지를 탐색한다', async () => {
		renderContent();

		await userEvent.click(screen.getByRole('img', { name: '첫 이미지', hidden: true }));

		const stage = await screen.findByTestId('post-image-lightbox-stage');

		fireEvent.touchStart(stage, { touches: [{ clientX: 200, clientY: 100 }] });
		fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 80, clientY: 100 }] });
		expect(screen.getByText('2 / 3')).toBeInTheDocument();
		expect(screen.getAllByRole('img', { name: '둘째 이미지' })).toHaveLength(2);

		fireEvent.touchStart(stage, { touches: [{ clientX: 200, clientY: 100 }] });
		fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 80, clientY: 100 }] });
		expect(screen.getByText('3 / 3')).toBeInTheDocument();
		expect(screen.getAllByRole('img', { name: '셋째 이미지' })).toHaveLength(2);

		fireEvent.touchStart(stage, { touches: [{ clientX: 80, clientY: 100 }] });
		fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 200, clientY: 100 }] });
		expect(screen.getByText('2 / 3')).toBeInTheDocument();
		expect(screen.getAllByRole('img', { name: '둘째 이미지' })).toHaveLength(2);
	});
});
