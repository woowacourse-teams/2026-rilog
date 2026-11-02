import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ResponsiveImage from './ResponsiveImage';

describe('ResponsiveImage', () => {
	it('sizes를 지정하지 않으면 기본값 100vw를 주입한다', () => {
		const rawProfileUrl = 'https://cdn.rilog.test/profiles/raw/user/original.png';
		const { container } = render(<ResponsiveImage src={rawProfileUrl} alt="프로필 이미지" />);

		const img = container.querySelector('img');
		expect(img?.getAttribute('srcset')).toContain('https://cdn.rilog.test/profiles/compact/user/50.webp 50w');
		expect(img?.getAttribute('sizes')).toBe('100vw');
	});

	it('명시적으로 전달된 sizes 속성을 우선 적용한다', () => {
		const rawUrl = 'https://cdn.rilog.test/images/raw/uuid/original.png';
		const { container } = render(
			<ResponsiveImage src={rawUrl} alt="테스트 이미지" sizes="(max-width: 768px) 100vw, 50vw" />,
		);

		const img = container.querySelector('img');
		expect(img?.getAttribute('sizes')).toBe('(max-width: 768px) 100vw, 50vw');
	});

	it.each([
		['구경로', 'https://cdn.rilog.test/originals/legacy.png'],
		['외부', 'https://example.com/photo.png'],
	])('%s 이미지에는 srcset과 sizes를 붙이지 않는다', (_, src) => {
		render(<ResponsiveImage src={src} alt="테스트 이미지" sizes="50vw" />);
		const image = screen.getByRole('img', { name: '테스트 이미지' });

		expect(image).not.toHaveAttribute('srcset');
		expect(image).not.toHaveAttribute('sizes');
	});

	it('srcset 이미지 에러 발생 시 raw로 1차 폴백하며 onError는 호출되지 않는다', () => {
		const rawUrl = 'https://cdn.rilog.test/images/raw/uuid/original.png';
		const handleError = vi.fn();
		const { container } = render(<ResponsiveImage src={rawUrl} alt="테스트 이미지" onError={handleError} />);

		const img = container.querySelector('img');
		expect(img?.hasAttribute('srcset')).toBe(true);

		fireEvent.error(img!);

		expect(img?.hasAttribute('srcset')).toBe(false);
		expect(img?.hasAttribute('sizes')).toBe(false);
		expect(img?.getAttribute('src')).toBe(rawUrl);
		expect(handleError).not.toHaveBeenCalled();
	});

	it('마운트 전에 srcset 이미지가 로드에 실패하면 raw 이미지로 폴백한다', () => {
		const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
		const naturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
		const rawUrl = 'https://cdn.rilog.test/images/raw/uuid/original.png';
		const handleError = vi.fn();

		try {
			render(<ResponsiveImage src={rawUrl} alt="실패 이미지" priority onError={handleError} />);
			const image = screen.getByRole('img', { name: '실패 이미지' });

			expect(image).toHaveAttribute('src', rawUrl);
			expect(image).not.toHaveAttribute('srcset');
			expect(image).not.toHaveAttribute('sizes');
			expect(handleError).not.toHaveBeenCalled();

			fireEvent.error(image);
			expect(handleError).toHaveBeenCalledTimes(1);
		} finally {
			complete.mockRestore();
			naturalWidth.mockRestore();
		}
	});

	it('마운트 전에 raw 이미지가 로드에 실패하면 onError를 호출한다', () => {
		const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
		const naturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
		const handleError = vi.fn();

		try {
			render(<ResponsiveImage src="https://example.com/broken.png" alt="실패 원본 이미지" onError={handleError} />);

			expect(handleError).toHaveBeenCalledTimes(1);
		} finally {
			complete.mockRestore();
			naturalWidth.mockRestore();
		}
	});

	it('마운트 전에 로드가 끝난 이미지가 정상이면 폴백하지 않는다', () => {
		const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
		const naturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(750);
		const handleError = vi.fn();

		try {
			render(
				<ResponsiveImage
					src="https://cdn.rilog.test/images/raw/uuid/original.png"
					alt="정상 이미지"
					onError={handleError}
				/>,
			);
			const image = screen.getByRole('img', { name: '정상 이미지' });

			expect(image).toHaveAttribute('srcset');
			expect(handleError).not.toHaveBeenCalled();
		} finally {
			complete.mockRestore();
			naturalWidth.mockRestore();
		}
	});

	it('원본으로 폴백한 뒤 src가 바뀌면 새 이미지의 srcset을 사용한다', () => {
		const firstUrl = 'https://cdn.rilog.test/images/raw/first/original.png';
		const nextUrl = 'https://cdn.rilog.test/images/raw/next/original.png';
		const handleError = vi.fn();
		const { rerender } = render(<ResponsiveImage src={firstUrl} alt="테스트 이미지" onError={handleError} />);
		const image = screen.getByRole('img', { name: '테스트 이미지' });

		fireEvent.error(image);
		expect(image).not.toHaveAttribute('srcset');

		rerender(<ResponsiveImage src={nextUrl} alt="테스트 이미지" onError={handleError} />);
		expect(image).toHaveAttribute('src', nextUrl);
		expect(image.getAttribute('srcset')).toContain('https://cdn.rilog.test/images/compact/next/750.webp 750w');
		expect(image).toHaveAttribute('sizes', '100vw');

		fireEvent.error(image);
		expect(image).not.toHaveAttribute('srcset');
		expect(image).not.toHaveAttribute('sizes');
		expect(handleError).not.toHaveBeenCalled();
	});

	it('raw 이미지(또는 srcset이 없는 이미지) 에러 발생 시 onError 콜백을 호출한다', () => {
		const externalUrl = 'https://example.com/broken.png';
		const handleError = vi.fn();
		const { container } = render(<ResponsiveImage src={externalUrl} alt="외부 이미지" onError={handleError} />);

		const img = container.querySelector('img');
		fireEvent.error(img!);

		expect(handleError).toHaveBeenCalledTimes(1);
	});

	it('priority=true일 때 loading="eager", fetchPriority="high" 속성을 부여한다', () => {
		const rawUrl = 'https://cdn.rilog.test/images/raw/uuid/original.png';
		const { container } = render(<ResponsiveImage src={rawUrl} alt="우선순위 이미지" priority />);

		const img = container.querySelector('img');
		expect(img?.getAttribute('loading')).toBe('eager');
		expect(img?.getAttribute('fetchpriority')).toBe('high');
	});

	it('fill=true일 때 absolute inset-0 size-full 클래스를 적용한다', () => {
		const rawUrl = 'https://cdn.rilog.test/images/raw/uuid/original.png';
		const { container } = render(<ResponsiveImage src={rawUrl} alt="채우기 이미지" fill className="object-cover" />);

		const img = container.querySelector('img');
		expect(img?.className).toContain('absolute inset-0 size-full');
		expect(img?.className).toContain('object-cover');
	});
});
