import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderMermaidDiagram } from '@/shared/lib/render-mermaid-diagram';

import MermaidDiagram from './MermaidDiagram';

vi.mock('@/shared/lib/render-mermaid-diagram', () => ({
	renderMermaidDiagram: vi.fn(),
}));

const renderMermaidDiagramMock = vi.mocked(renderMermaidDiagram);

describe('MermaidDiagram', () => {
	beforeEach(() => {
		renderMermaidDiagramMock.mockReset();
	});

	it('Mermaid SVG를 접근 가능한 다이어그램으로 표시한다', async () => {
		renderMermaidDiagramMock.mockResolvedValue('<svg><text>Start</text></svg>');
		render(<MermaidDiagram ariaLabel="Mermaid 다이어그램" source="graph TD; A-->B" />);

		expect(screen.getByRole('status')).toHaveTextContent('다이어그램을 그리는 중입니다.');
		const diagram = await screen.findByRole('img', { name: 'Mermaid 다이어그램' });

		expect(diagram).toHaveAttribute('data-state', 'ready');
		expect(diagram.querySelector('svg')).toHaveTextContent('Start');
	});

	it('문법 오류가 발생하면 원인을 확인할 수 있는 메시지를 표시한다', async () => {
		renderMermaidDiagramMock.mockRejectedValue(new Error('Invalid Mermaid syntax'));
		render(<MermaidDiagram ariaLabel="Mermaid 다이어그램" source="not a diagram" />);

		await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Mermaid 문법을 확인해 주세요.'));
	});
});
