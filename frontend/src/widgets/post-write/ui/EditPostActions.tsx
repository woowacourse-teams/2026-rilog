import type { PostWriteEditorContext } from '@/features/post-write/model/post-editor';
import WritePublishActionBar from '@/features/post-write/ui/WritePublishActionBar';

interface EditPostActionsProps {
	editor: PostWriteEditorContext;
}

export default function EditPostActions({ editor }: EditPostActionsProps) {
	return (
		<WritePublishActionBar
			isPublishReady={editor.isEditorReady && editor.isDirty}
			publishLabel="수정"
			onPublish={editor.openPublishSettings}
		/>
	);
}
