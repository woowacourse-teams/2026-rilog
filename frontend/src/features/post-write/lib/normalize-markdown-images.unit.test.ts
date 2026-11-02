import { describe, expect, it } from 'vitest';

import { normalizeMarkdownImages } from './normalize-markdown-images';

describe('normalizeMarkdownImages', () => {
	it('텍스트와 마크다운 이미지 사이에 빈 줄이 없으면 빈 줄을 삽입한다', () => {
		const input = '본문 앞\n![](https://example.com/1.png)\n본문 뒤';
		const expected = '본문 앞\n\n![](https://example.com/1.png)\n\n본문 뒤';

		expect(normalizeMarkdownImages(input)).toBe(expected);
	});

	it('여러 마크다운 이미지가 빈 줄 없이 연속으로 있으면 각각 빈 줄로 분리한다', () => {
		const input = '![](https://example.com/1.png)\n![](https://example.com/2.png)\n![](https://example.com/3.png)';
		const expected =
			'![](https://example.com/1.png)\n\n![](https://example.com/2.png)\n\n![](https://example.com/3.png)';

		expect(normalizeMarkdownImages(input)).toBe(expected);
	});

	it('이미 빈 줄로 분리되어 있는 마크다운 이미지는 그대로 유지한다', () => {
		const input = '본문\n\n![](https://example.com/1.png)\n\n다음 본문';

		expect(normalizeMarkdownImages(input)).toBe(input);
	});

	it('Windows 개행으로 이미 분리된 마크다운 이미지는 개행을 바꾸지 않는다', () => {
		const input = '본문\r\n\r\n![](https://example.com/1.png)\r\n\r\n다음 본문';

		expect(normalizeMarkdownImages(input)).toBe(input);
	});

	it('마크다운 이미지가 없는 일반 텍스트는 변경하지 않는다', () => {
		const input = '일반 줄 1\n일반 줄 2\n[일반 링크](https://example.com)';

		expect(normalizeMarkdownImages(input)).toBe(input);
	});

	it('마크다운 이미지 줄에 앞뒤 공백이 있어도 빈 줄로 분리한다', () => {
		const input = '본문\n  ![](https://example.com/1.png)  \n본문';
		const expected = '본문\n\n![](https://example.com/1.png)\n\n본문';

		expect(normalizeMarkdownImages(input)).toBe(expected);
	});
});
