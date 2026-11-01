import type { PostContentBlock } from '@/domains/post/model/post-content';

const isEmptyUploadBlock = (block: PostContentBlock): boolean => {
	if (block.type !== 'image' && block.type !== 'file' && block.type !== 'video' && block.type !== 'audio') {
		return false;
	}

	return block.props.url.trim().length === 0;
};

export const removeEmptyUploadBlocks = (blocks: PostContentBlock[]): PostContentBlock[] => {
	const result: PostContentBlock[] = [];

	for (const block of blocks) {
		const children = removeEmptyUploadBlocks(block.children);
		if (isEmptyUploadBlock(block)) {
			result.push(...children);
		} else if (block.type === 'column') {
			if (children.length > 0) {
				result.push({ ...block, children });
			}
		} else if (block.type === 'columnList') {
			if (children.length === 1) {
				const [remainingColumn] = children;
				result.push(...(remainingColumn.type === 'column' ? remainingColumn.children : [remainingColumn]));
			} else if (children.length > 1) {
				result.push({ ...block, children });
			}
		} else {
			result.push(block.children.length === 0 ? block : { ...block, children });
		}
	}

	return result;
};
