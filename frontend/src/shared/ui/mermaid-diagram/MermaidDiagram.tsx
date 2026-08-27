'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { renderMermaidDiagram } from '@/shared/lib/render-mermaid-diagram';

import './MermaidDiagram.css';

interface MermaidDiagramProps {
	ariaLabel: string;
	debounceMs?: number;
	source: string;
}

type MermaidRenderState = { status: 'idle' | 'loading' } | { status: 'ready'; svg: string } | { status: 'error' };

export default function MermaidDiagram({ ariaLabel, debounceMs = 0, source }: MermaidDiagramProps) {
	const diagramId = useId().replaceAll(':', '');
	const renderCountRef = useRef(0);
	const [renderState, setRenderState] = useState<MermaidRenderState>({ status: 'idle' });

	useEffect(() => {
		if (source.trim().length === 0) {
			return;
		}

		let isCancelled = false;
		const timeoutId = window.setTimeout(() => {
			setRenderState({ status: 'loading' });
			renderCountRef.current += 1;

			void renderMermaidDiagram(`mermaid-${diagramId}-${renderCountRef.current}`, source)
				.then((svg) => {
					if (!isCancelled) {
						setRenderState({ status: 'ready', svg });
					}
				})
				.catch(() => {
					if (!isCancelled) {
						setRenderState({ status: 'error' });
					}
				});
		}, debounceMs);

		return () => {
			isCancelled = true;
			window.clearTimeout(timeoutId);
		};
	}, [debounceMs, diagramId, source]);

	if (source.trim().length === 0) {
		return null;
	}

	if (renderState.status === 'ready') {
		return (
			<div
				className="mermaid-diagram"
				data-mermaid-diagram=""
				data-state="ready"
				role="img"
				aria-label={ariaLabel}
				dangerouslySetInnerHTML={{ __html: renderState.svg }}
			/>
		);
	}

	if (renderState.status === 'error') {
		return (
			<div className="mermaid-diagram" data-mermaid-diagram="" data-state="error" role="alert">
				Mermaid 문법을 확인해 주세요.
			</div>
		);
	}

	return (
		<div className="mermaid-diagram" data-mermaid-diagram="" data-state="loading" role="status">
			다이어그램을 그리는 중입니다.
		</div>
	);
}
