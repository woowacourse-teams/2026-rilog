'use client';

import { FilePanelExtension } from '@blocknote/core/extensions';
import { EmbedTab, FilePanel, useBlockNoteEditor, useDictionary, useExtension } from '@blocknote/react';

import type { POST_WRITE_SCHEMA } from '../lib/post-write-schema';

import { usePostWriteFilePanelUpload } from '../hooks/use-post-write-file-panel-upload';

interface PostWriteFilePanelProps {
	blockId: string;
	onSuccess?: () => void;
}

function PostWriteUploadTab({ blockId, onSuccess }: PostWriteFilePanelProps) {
	const editor = useBlockNoteEditor<
		typeof POST_WRITE_SCHEMA.blockSchema,
		typeof POST_WRITE_SCHEMA.inlineContentSchema,
		typeof POST_WRITE_SCHEMA.styleSchema
	>();
	const dict = useDictionary();
	const filePanel = useExtension(FilePanelExtension);
	const { uploadFiles, isUploading, errorMessage } = usePostWriteFilePanelUpload(editor, blockId, () => {
		filePanel.closeMenu();
		onSuccess?.();
	});
	const block = editor.getBlock(blockId);

	if (block === undefined) {
		return null;
	}

	const accept = editor.schema.blockSpecs[block.type].implementation.meta?.fileBlockAccept?.join(',') ?? '*/*';
	const label = dict.file_panel.upload.file_placeholder[block.type] ?? dict.file_panel.upload.file_placeholder.file;

	return (
		<div className="bn-tab-panel">
			<input
				className="bn-file-input"
				type="file"
				accept={accept}
				multiple
				aria-label={label}
				disabled={isUploading}
				onChange={(event) => {
					const files = Array.from(event.currentTarget.files ?? []);
					event.currentTarget.value = '';
					void uploadFiles(files);
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
		</div>
	);
}

export default function PostWriteFilePanel({ blockId, onSuccess }: PostWriteFilePanelProps) {
	const dict = useDictionary();
	return (
		<FilePanel
			blockId={blockId}
			tabs={[
				{
					name: dict.file_panel.upload.title,
					tabPanel: <PostWriteUploadTab blockId={blockId} onSuccess={onSuccess} />,
				},
				{ name: dict.file_panel.embed.title, tabPanel: <EmbedTab blockId={blockId} /> },
			]}
		/>
	);
}
