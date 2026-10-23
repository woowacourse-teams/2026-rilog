'use client';

import { blockHasType } from '@blocknote/core';
import {
	FormattingToolbar,
	FormattingToolbarController,
	getFormattingToolbarItems,
	useBlockNoteEditor,
	useComponentsContext,
	useDictionary,
	useEditorState,
} from '@blocknote/react';
import { useCallback, useState } from 'react';

import PostWriteFilePanel from './PostWriteFilePanel';

function PostWriteFileReplaceButton() {
	const editor = useBlockNoteEditor();
	const components = useComponentsContext();
	const dict = useDictionary();
	const [isOpen, setIsOpen] = useState(false);

	const block = useEditorState({
		editor,
		selector: ({ editor: currentEditor }) => {
			if (!currentEditor.isEditable) {
				return undefined;
			}
			const selectedBlocks = currentEditor.getSelection()?.blocks ?? [currentEditor.getTextCursorPosition().block];
			if (selectedBlocks.length !== 1) {
				return undefined;
			}
			const selectedBlock = selectedBlocks[0];
			return blockHasType(selectedBlock, currentEditor, selectedBlock.type, { url: 'string' })
				? selectedBlock
				: undefined;
		},
	});

	if (block === undefined || components === undefined) {
		return null;
	}

	const label =
		block.type === 'image'
			? dict.formatting_toolbar.file_replace.tooltip.image
			: dict.formatting_toolbar.file_replace.tooltip.file;

	return (
		<components.Generic.Popover.Root open={isOpen} onOpenChange={setIsOpen} position="bottom">
			<components.Generic.Popover.Trigger>
				<components.FormattingToolbar.Button
					className="bn-button"
					mainTooltip={label}
					label={label}
					icon={
						<svg
							aria-hidden="true"
							width="1em"
							height="1em"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<rect x="3" y="3" width="18" height="18" rx="2" />
							<circle cx="8.5" cy="8.5" r="1.5" />
							<path d="m3 17 5-5 4 4 2-2 7 7" />
						</svg>
					}
				/>
			</components.Generic.Popover.Trigger>
			<components.Generic.Popover.Content className="bn-popover-content bn-panel-popover" variant="panel-popover">
				{isOpen && <PostWriteFilePanel blockId={block.id} onSuccess={() => setIsOpen(false)} />}
			</components.Generic.Popover.Content>
		</components.Generic.Popover.Root>
	);
}

export default function PostWriteFormattingToolbar() {
	const toolbar = useCallback(
		() => (
			<FormattingToolbar>
				{getFormattingToolbarItems().map((item) =>
					item.key === 'replaceFileButton' ? <PostWriteFileReplaceButton key={item.key} /> : item,
				)}
			</FormattingToolbar>
		),
		[],
	);
	return <FormattingToolbarController formattingToolbar={toolbar} />;
}
