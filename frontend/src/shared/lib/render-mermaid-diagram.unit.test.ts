// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { renderMermaidDiagram } from './render-mermaid-diagram';

describe('renderMermaidDiagram', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it.each(['not a diagram', 'graph TD; A --> ['])(
		'잘못된 문법 %s의 오류 이미지를 문서에 남기지 않는다',
		async (source) => {
			await expect(renderMermaidDiagram('invalid-diagram', source)).rejects.toThrow();

			expect(document.body.childElementCount).toBe(0);
		},
	);
});
