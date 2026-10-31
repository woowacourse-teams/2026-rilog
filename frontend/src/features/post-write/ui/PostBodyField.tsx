import type { PostEditorHandle, PostEditorProps } from '../model/post-editor';
import type { ComponentType, RefObject } from 'react';

import type { PostContentBlock } from '@/domains/post/model/post-content';

interface PostBodyFieldProps {
	editorComponent: ComponentType<PostEditorProps>;
	editorRef: RefObject<PostEditorHandle | null>;
	initialBlocks?: PostContentBlock[];
	error?: string;
	onReady: PostEditorProps['onReady'];
	onChange: PostEditorProps['onChange'];
	uploadFile: PostEditorProps['uploadFile'];
}

const POST_BODY_ERROR_ID = 'post-body-error';

export default function PostBodyField(props: PostBodyFieldProps) {
	const { editorRef, initialBlocks, error, onReady, onChange, uploadFile } = props;

	return (
		<>
			<props.editorComponent
				ref={editorRef}
				initialBlocks={initialBlocks}
				onReady={onReady}
				onChange={onChange}
				uploadFile={uploadFile}
				ariaDescribedBy={error === undefined ? undefined : POST_BODY_ERROR_ID}
			/>
			{error !== undefined && (
				<p id={POST_BODY_ERROR_ID} className="mt-3 text-body-4 text-danger-text" role="alert">
					{error}
				</p>
			)}
		</>
	);
}
