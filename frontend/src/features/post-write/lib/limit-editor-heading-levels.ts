import type { Block } from '@blocknote/core';

/** Keep older documents editable after restricting the writing schema to H1–H4. */
export const limitEditorHeadingLevels = (blocks: Block[]): Block[] =>
	blocks.map((block) => {
		const children = block.children.length > 0 ? limitEditorHeadingLevels(block.children) : block.children;
		if (block.type === 'heading' && block.props.level > 4) {
			return { ...block, props: { ...block.props, level: 4 }, children };
		}

		return children === block.children ? block : { ...block, children };
	});
