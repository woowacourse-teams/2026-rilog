import type { Block } from '@blocknote/core';

export interface PostDocumentErrors {
	title?: string;
	body?: string;
}

const MEDIA_BLOCK_TYPES = new Set(['audio', 'file', 'image', 'video']);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const hasMeaningfulText = (value: unknown): boolean => {
	if (typeof value === 'string') {
		return value.trim().length > 0;
	}

	if (Array.isArray(value)) {
		return value.some(hasMeaningfulText);
	}

	if (!isRecord(value)) {
		return false;
	}

	if (typeof value.text === 'string' && value.text.trim().length > 0) {
		return true;
	}

	return hasMeaningfulText(value.content);
};

const hasMediaUrl = (block: Block): boolean => {
	if (!MEDIA_BLOCK_TYPES.has(block.type)) {
		return false;
	}

	const props = block.props as Record<string, unknown>;
	return typeof props.url === 'string' && props.url.trim().length > 0;
};

const isMeaningfulBlock = (block: Block): boolean =>
	hasMeaningfulText(block.content) || hasMediaUrl(block) || block.children.some(isMeaningfulBlock);

export const isMeaningfulPostBody = (blocks: Block[]) => blocks.some(isMeaningfulBlock);

export const validatePostDocument = (title: string, blocks: Block[]): PostDocumentErrors => {
	const errors: PostDocumentErrors = {};

	if (title.trim().length === 0) {
		errors.title = '제목을 입력해 주세요.';
	} else if (title.length > 512) {
		errors.title = '제목은 512자 이하로 입력해 주세요.';
	}

	if (!isMeaningfulPostBody(blocks)) {
		errors.body = '내용을 입력해 주세요.';
	}

	return errors;
};
