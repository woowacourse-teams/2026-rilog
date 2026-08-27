'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import MermaidDiagram from './MermaidDiagram';

interface MermaidCodeBlockPreviewControllerProps {
	container?: HTMLElement | null;
	debounceMs?: number;
	label: string;
}

interface MermaidCodeBlockTarget {
	codeBlock: HTMLElement;
	source: string;
}

const MERMAID_LANGUAGES = new Set(['mermaid', 'mmd']);
const CODE_BLOCK_SELECTOR = '.bn-block-content[data-content-type="codeBlock"][data-language]';

const getMermaidCodeBlockTargets = (container: HTMLElement): MermaidCodeBlockTarget[] =>
	Array.from(container.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR))
		.filter((codeBlock) => MERMAID_LANGUAGES.has(codeBlock.dataset.language?.toLowerCase() ?? ''))
		.map((codeBlock) => ({
			codeBlock,
			source: codeBlock.querySelector('pre > code')?.textContent ?? '',
		}));

export default function MermaidCodeBlockPreviewController({
	container,
	debounceMs,
	label,
}: MermaidCodeBlockPreviewControllerProps) {
	const [targets, setTargets] = useState<MermaidCodeBlockTarget[]>([]);

	useEffect(() => {
		if (container === null || container === undefined) {
			return;
		}

		const updateTargets = () => {
			const nextTargets = getMermaidCodeBlockTargets(container);
			setTargets((currentTargets) => {
				const hasSameTargets =
					currentTargets.length === nextTargets.length &&
					currentTargets.every(
						(target, index) =>
							target.codeBlock === nextTargets[index]?.codeBlock && target.source === nextTargets[index]?.source,
					);

				return hasSameTargets ? currentTargets : nextTargets;
			});
		};

		updateTargets();
		const observer = new MutationObserver(updateTargets);
		observer.observe(container, { characterData: true, childList: true, subtree: true });

		return () => observer.disconnect();
	}, [container]);

	return (
		<>
			{targets.map(({ codeBlock, source }, index) => {
				const blockId = codeBlock.closest<HTMLElement>('.bn-block-outer[data-id]')?.dataset.id;

				return createPortal(
					<MermaidDiagram key={source} ariaLabel={label} debounceMs={debounceMs} source={source} />,
					codeBlock,
					blockId ?? `mermaid-code-block-${index}`,
				);
			})}
		</>
	);
}
