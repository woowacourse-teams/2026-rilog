import type { Block } from '@blocknote/core';

const isEmptyUploadBlock = (block: Block): boolean => {
	if (block.type !== 'image' && block.type !== 'file' && block.type !== 'video' && block.type !== 'audio') {
		return false;
	}

	return block.props.url.trim().length === 0;
};

export const removeEmptyUploadBlocks = (blocks: Block[]): Block[] => {
	const result: Block[] = [];

	for (const block of blocks) {
		const children = removeEmptyUploadBlocks(block.children);
		if (isEmptyUploadBlock(block)) {
			result.push(...children);
		} else {
			result.push(block.children.length === 0 ? block : { ...block, children });
		}
	}

	return result;
};
