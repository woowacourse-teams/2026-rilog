import type { Block } from '@blocknote/core';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isNonNegativeInteger = (value: unknown): boolean =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isOptional = (value: unknown, guard: (candidate: unknown) => boolean): boolean =>
	value === undefined || guard(value);

const isStyles = (value: unknown): boolean => {
	if (!isRecord(value)) return false;
	return Object.entries(value).every(([key, style]) => {
		if (key === 'textColor' || key === 'backgroundColor') return isString(style);
		return ['bold', 'italic', 'underline', 'strike', 'code'].includes(key) && typeof style === 'boolean';
	});
};

const isText = (value: unknown): boolean =>
	isRecord(value) && value.type === 'text' && isString(value.text) && isStyles(value.styles);
const isPlainText = (value: unknown): boolean =>
	isText(value) && isRecord(value) && isRecord(value.styles) && Object.keys(value.styles).length === 0;

const isInlineContent = (value: unknown): boolean => {
	if (!isRecord(value)) return false;
	if (value.type === 'text') return isText(value);
	return value.type === 'link' && isString(value.href) && Array.isArray(value.content) && value.content.every(isText);
};

const isTableCell = (value: unknown): boolean => {
	if (Array.isArray(value)) return value.every(isInlineContent);
	if (!isRecord(value) || value.type !== 'tableCell' || !isRecord(value.props) || !Array.isArray(value.content)) {
		return false;
	}
	const { backgroundColor, textColor, textAlignment, colspan, rowspan } = value.props;
	return (
		isString(backgroundColor) &&
		isString(textColor) &&
		isString(textAlignment) &&
		ALIGNMENTS.has(textAlignment) &&
		isOptional(colspan, isNonNegativeInteger) &&
		isOptional(rowspan, isNonNegativeInteger) &&
		value.content.every(isInlineContent)
	);
};

const isTableContent = (value: unknown): boolean => {
	if (
		!isRecord(value) ||
		value.type !== 'tableContent' ||
		!Array.isArray(value.rows) ||
		!Array.isArray(value.columnWidths)
	)
		return false;
	if (!value.columnWidths.every((width) => width === null || width === undefined || isFiniteNumber(width)))
		return false;
	if (!isOptional(value.headerRows, isNonNegativeInteger) || !isOptional(value.headerCols, isNonNegativeInteger))
		return false;
	return value.rows.every((row: unknown) => isRecord(row) && Array.isArray(row.cells) && row.cells.every(isTableCell));
};

const TEXT_BLOCKS = new Set([
	'paragraph',
	'heading',
	'quote',
	'bulletListItem',
	'numberedListItem',
	'checkListItem',
	'toggleListItem',
]);
const FILE_BLOCKS = new Set(['image', 'video', 'audio', 'file']);
const ALIGNMENTS = new Set(['left', 'center', 'right', 'justify']);

const hasValidProps = (type: string, props: Record<string, unknown>): boolean => {
	if ((TEXT_BLOCKS.has(type) || FILE_BLOCKS.has(type)) && !isString(props.backgroundColor)) return false;
	if (TEXT_BLOCKS.has(type) && !isString(props.textColor)) return false;
	if (type === 'table' && !isString(props.textColor)) return false;
	if (
		TEXT_BLOCKS.has(type) &&
		type !== 'quote' &&
		(!isString(props.textAlignment) || !ALIGNMENTS.has(props.textAlignment))
	)
		return false;
	if (
		(type === 'image' || type === 'video') &&
		(!isString(props.textAlignment) || !ALIGNMENTS.has(props.textAlignment))
	)
		return false;
	if (type === 'heading') {
		if (![1, 2, 3, 4, 5, 6].includes(props.level as number)) return false;
		if (props.isToggleable !== undefined && typeof props.isToggleable !== 'boolean') return false;
	}
	if (type === 'numberedListItem' && props.start !== undefined && !isFiniteNumber(props.start)) return false;
	if (type === 'checkListItem' && typeof props.checked !== 'boolean') return false;
	if (type === 'codeBlock' && !isString(props.language)) return false;
	if (FILE_BLOCKS.has(type)) {
		if (!['name', 'url', 'caption'].every((key) => isString(props[key]))) return false;
		if (type !== 'file' && typeof props.showPreview !== 'boolean') return false;
		if (props.previewWidth !== undefined && !isFiniteNumber(props.previewWidth)) return false;
	}
	return true;
};

const isBlock = (value: unknown): boolean => {
	if (
		!isRecord(value) ||
		!isString(value.id) ||
		value.id.length === 0 ||
		!isString(value.type) ||
		!isRecord(value.props)
	) {
		return false;
	}
	if (!Array.isArray(value.children) || !value.children.every(isBlock) || !hasValidProps(value.type, value.props))
		return false;
	if (TEXT_BLOCKS.has(value.type)) return Array.isArray(value.content) && value.content.every(isInlineContent);
	if (value.type === 'codeBlock') return Array.isArray(value.content) && value.content.every(isPlainText);
	if (value.type === 'table') return isTableContent(value.content);
	if (value.type === 'divider' || FILE_BLOCKS.has(value.type)) {
		return value.content === undefined || (Array.isArray(value.content) && value.content.length === 0);
	}
	return false;
};

/** The editor's default BlockNote 0.53 schema, including its configured code block. */
export const isBlockNoteDocument = (value: unknown): value is Block[] => Array.isArray(value) && value.every(isBlock);
