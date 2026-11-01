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

	it('라이트박스를 닫은 뒤 본문 이미지를 다시 열어도 전체 이미지 개수가 유지된다', async () => {
		const user = userEvent.setup();
		renderContent();
		const firstImage = screen.getByRole('img', { name: '첫 이미지', hidden: true });

		await user.click(firstImage);
		expect(await screen.findByText('1 / 3')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '이미지 닫기' }));
		await user.click(firstImage);

		expect(screen.getByText('1 / 3')).toBeInTheDocument();
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

	it('탐색 버튼이 비활성화되는 첫 이미지와 마지막 이미지에서도 포커스를 모달 안에 유지한다', async () => {
		const user = userEvent.setup();
		renderContent();
		await user.click(screen.getByRole('img', { name: '첫 이미지', hidden: true }));

		const prevButton = screen.getByRole('button', { name: '이전 이미지' });
		const nextButton = screen.getByRole('button', { name: '다음 이미지' });
		await user.click(nextButton);
		await user.click(nextButton);
		expect(screen.getByText('3 / 3')).toBeInTheDocument();
		expect(prevButton).toHaveFocus();

		await user.keyboard('{ArrowLeft}{ArrowLeft}');
		expect(screen.getByText('1 / 3')).toBeInTheDocument();
		expect(nextButton).toHaveFocus();
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

	it('모바일 두 손가락 핀치로 이미지를 확대하고 한 손가락 드래그로 이동한다', async () => {
		renderContent();

		await userEvent.click(screen.getByRole('img', { name: '첫 이미지', hidden: true }));

		const stage = await screen.findByTestId('post-image-lightbox-stage');
		const lightboxImage = stage.querySelector('img');
		expect(lightboxImage).not.toBeNull();

		// 두 손가락 간격 100px -> 200px로 핀치 확대 (2배)
		fireEvent.touchStart(stage, {
			touches: [
				{ clientX: 100, clientY: 100 },
				{ clientX: 200, clientY: 100 },
			],
		});
		fireEvent.touchMove(stage, {
			touches: [
				{ clientX: 50, clientY: 100 },
				{ clientX: 250, clientY: 100 },
			],
		});
		fireEvent.touchEnd(stage, {
			touches: [],
			changedTouches: [{ clientX: 250, clientY: 100 }],
		});

		expect(lightboxImage).toHaveStyle({ transform: 'translate3d(0px, 0px, 0px) scale(2)' });

		// 확대 상태에서는 한 손가락 좌우 드래그 시 다음 이미지로 넘어가지 않고 이미지를 이동한다
		fireEvent.touchStart(stage, { touches: [{ clientX: 200, clientY: 100 }] });
		fireEvent.touchMove(stage, { touches: [{ clientX: 80, clientY: 130 }] });
		fireEvent.touchEnd(stage, {
			touches: [],
			changedTouches: [{ clientX: 80, clientY: 130 }],
		});

		expect(screen.getByText('1 / 3')).toBeInTheDocument();
		expect(lightboxImage).toHaveStyle({ transform: 'translate3d(-120px, 30px, 0px) scale(2)' });

		// 다음 이미지로 이동하면 확대 상태가 초기화된다
		await userEvent.click(screen.getByRole('button', { name: '다음 이미지' }));
		expect(screen.getByText('2 / 3')).toBeInTheDocument();
		expect(lightboxImage?.style.transform).toBe('');
	});
});
