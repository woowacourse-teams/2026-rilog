/* eslint-disable @next/next/no-img-element */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import PostImageFallback from './PostImageFallback';

describe('PostImageFallback', () => {
	afterEach(() => {
		cleanup();
	});

	it('자식 엘리먼트를 정상적으로 렌더링한다', () => {
		const { container } = render(
			<PostImageFallback>
				<div data-testid="child">본문 내용</div>
			</PostImageFallback>,
		);

		expect(container.textContent).toContain('본문 내용');
	});

	it('이미지 로드 에러 발생 시 srcset과 sizes 속성을 제거한다', () => {
		const { container } = render(
			<PostImageFallback>
				<div>
					<img
						alt="테스트 이미지"
						src="https://cdn.rilog.test/images/raw/uuid/original.png"
						srcSet="https://cdn.rilog.test/images/compact/uuid/750.webp 750w"
						sizes="(min-width: 672px) 672px, 100vw"
					/>
				</div>
			</PostImageFallback>,
		);

		const image = container.querySelector('img');
		expect(image).not.toBeNull();
		expect(image?.hasAttribute('srcset')).toBe(true);
		expect(image?.hasAttribute('sizes')).toBe(true);

		fireEvent.error(image!);

		expect(image?.hasAttribute('srcset')).toBe(false);
		expect(image?.hasAttribute('sizes')).toBe(false);
		expect(image?.getAttribute('src')).toBe('https://cdn.rilog.test/images/raw/uuid/original.png');
	});

	it('srcset이 없는 이미지는 error가 발생해도 추가 동작을 수행하지 않는다', () => {
		const { container } = render(
			<PostImageFallback>
				<div>
					<img alt="원본 이미지" src="https://cdn.rilog.test/images/raw/uuid/original.png" />
				</div>
			</PostImageFallback>,
		);

		const image = container.querySelector('img');
		expect(image?.hasAttribute('srcset')).toBe(false);

		fireEvent.error(image!);

		expect(image?.hasAttribute('srcset')).toBe(false);
		expect(image?.getAttribute('src')).toBe('https://cdn.rilog.test/images/raw/uuid/original.png');
	});

	it('마운트 시점에 이미 로드 실패(complete=true, naturalWidth=0)한 이미지의 srcset과 sizes를 제거한다', () => {
		const originalComplete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete');
		const originalNaturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth');

		Object.defineProperty(HTMLImageElement.prototype, 'complete', {
			configurable: true,
			get: () => true,
		});
		Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
			configurable: true,
			get: () => 0,
		});

		try {
			const { container } = render(
				<PostImageFallback>
					<div>
						<img
							alt="실패 이미지"
							src="https://cdn.rilog.test/images/raw/uuid/original.png"
							srcSet="https://cdn.rilog.test/images/compact/uuid/750.webp 750w"
							sizes="100vw"
						/>
					</div>
				</PostImageFallback>,
			);

			const image = container.querySelector('img');
			expect(image?.hasAttribute('srcset')).toBe(false);
			expect(image?.hasAttribute('sizes')).toBe(false);
		} finally {
			if (originalComplete) {
				Object.defineProperty(HTMLImageElement.prototype, 'complete', originalComplete);
			}
			if (originalNaturalWidth) {
				Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', originalNaturalWidth);
			}
		}
	});
});
