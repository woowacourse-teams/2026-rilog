import type { Block } from '@blocknote/core';

export class InvalidPostMediaError extends Error {
	constructor() {
		super('저장할 수 없는 이미지 또는 파일이 포함되어 있습니다. 해당 항목을 삭제하고 파일로 다시 업로드해 주세요.');
		this.name = 'InvalidPostMediaError';
	}
}

export const isTransientMediaUrl = (url: string): boolean => {
	try {
		const { protocol } = new URL(url.trim());
		return protocol === 'data:' || protocol === 'blob:';
	} catch {
		// Relative object keys and empty upload placeholders remain valid here.
		return false;
	}
};

export const validatePostMediaUrl = (url: string): void => {
	if (isTransientMediaUrl(url)) {
		throw new InvalidPostMediaError();
	}
};

export const validatePostMedia = (blocks: Block[]): void => {
	for (const block of blocks) {
		if (block.type === 'image' || block.type === 'file' || block.type === 'video' || block.type === 'audio') {
			validatePostMediaUrl(block.props.url);
		}
		validatePostMedia(block.children);
	}
};
