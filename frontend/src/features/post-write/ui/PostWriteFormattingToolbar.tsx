'use client';

import { blockHasType } from '@blocknote/core';
import {
	EmbedTab,
	FilePanel,
	FormattingToolbar,
	FormattingToolbarController,
	getFormattingToolbarItems,
	useBlockNoteEditor,
	useComponentsContext,
	useDictionary,
	useEditorState,
} from '@blocknote/react';
import { useCallback, useState } from 'react';

import type { UploadPostBodyFile } from '../model/post-editor';

import { getUploadErrorMessage } from '../lib/get-upload-error-message';

interface PostWriteFormattingToolbarProps {
	uploadFile: UploadPostBodyFile;
}

function PostWriteFileReplaceButton({ uploadFile }: PostWriteFormattingToolbarProps) {
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
				{isOpen && (
					<PostWriteReplaceFilePanel blockId={block.id} uploadFile={uploadFile} onSuccess={() => setIsOpen(false)} />
				)}
			</components.Generic.Popover.Content>
		</components.Generic.Popover.Root>
	);
}

interface PostWriteReplaceFilePanelProps extends PostWriteFormattingToolbarProps {
	blockId: string;
	onSuccess: () => void;
}

function PostWriteReplaceFilePanel({ blockId, uploadFile, onSuccess }: PostWriteReplaceFilePanelProps) {
	const dict = useDictionary();
	return (
		<FilePanel
			blockId={blockId}
			tabs={[
				{
					name: dict.file_panel.upload.title,
					tabPanel: <PostWriteReplaceUploadTab blockId={blockId} uploadFile={uploadFile} onSuccess={onSuccess} />,
				},
				{ name: dict.file_panel.embed.title, tabPanel: <EmbedTab blockId={blockId} /> },
			]}
		/>
	);
}

function PostWriteReplaceUploadTab({ blockId, uploadFile, onSuccess }: PostWriteReplaceFilePanelProps) {
	const editor = useBlockNoteEditor();
	const components = useComponentsContext();
	const dict = useDictionary();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [inputKey, setInputKey] = useState(0);
	const block = editor.getBlock(blockId);

	const handleFileChange = useCallback(
		async (file: File | null) => {
			if (file === null || isUploading) {
				return;
			}
			setInputKey((key) => key + 1);
			setErrorMessage(null);
			setIsUploading(true);
			try {
				const url = await uploadFile(file);
				if (editor.getBlock(blockId) !== undefined) {
					editor.updateBlock(blockId, { props: { name: file.name, url } });
					onSuccess();
				}
			} catch (error) {
				setErrorMessage(getUploadErrorMessage(error));
			} finally {
				setIsUploading(false);
			}
		},
		[blockId, editor, isUploading, onSuccess, uploadFile],
	);

	if (block === undefined || components === undefined) {
		return null;
	}

	const accept = editor.schema.blockSpecs[block.type].implementation.meta?.fileBlockAccept?.join(',') || '*/*';

	return (
		<components.FilePanel.TabPanel className="bn-tab-panel">
			<components.FilePanel.FileInput
				key={inputKey}
				className="bn-file-input"
				accept={accept}
				placeholder={
					dict.file_panel.upload.file_placeholder[block.type] ?? dict.file_panel.upload.file_placeholder.file
				}
				value={null}
				onChange={(file) => {
					void handleFileChange(file);
				}}
			/>
			{isUploading && (
				<p className="post-write-upload-status" role="status">
					업로드 중...
				</p>
			)}
			{errorMessage !== null && (
				<p className="post-write-upload-error" role="alert">
					{errorMessage}
				</p>
			)}
		</components.FilePanel.TabPanel>
	);
}

export default function PostWriteFormattingToolbar({ uploadFile }: PostWriteFormattingToolbarProps) {
	const toolbar = useCallback(
		() => (
			<FormattingToolbar>
				{getFormattingToolbarItems().map((item) =>
					item.key === 'replaceFileButton' ? (
						<PostWriteFileReplaceButton key={item.key} uploadFile={uploadFile} />
					) : (
						item
					),
				)}
			</FormattingToolbar>
		),
		[uploadFile],
	);
	return <FormattingToolbarController formattingToolbar={toolbar} />;
}
