import type { Mermaid } from 'mermaid';

let mermaidPromise: Promise<Mermaid> | undefined;

const getMermaid = () => {
	mermaidPromise ??= import('mermaid').then(({ default: mermaid }) => {
		mermaid.initialize({
			securityLevel: 'strict',
			startOnLoad: false,
			theme: 'neutral',
			themeVariables: {
				fontSize: '14px',
			},
		});

		return mermaid;
	});

	return mermaidPromise;
};

export const renderMermaidDiagram = async (id: string, source: string): Promise<string> => {
	const mermaid = await getMermaid();
	const { svg } = await mermaid.render(id, source);

	return svg;
};
