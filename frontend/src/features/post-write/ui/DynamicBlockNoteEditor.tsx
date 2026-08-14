'use client';

import dynamic from 'next/dynamic';

import type { PostEditorProps } from '../model/post-editor';

// 브라우저 API를 사용하는 BlockNote를 client에서만 불러오고, 로드 상태와 실패 UI를 함께 처리
const CLIENT_BLOCK_NOTE_EDITOR = dynamic<PostEditorProps>(
	() => import('./BlockNoteEditor').catch(() => import('./EditorLoadError')),
	{
		ssr: false,
		loading: () => <div className="min-h-80 bg-transparent" role="status" aria-label="에디터 불러오는 중" />,
	},
);

export default function DynamicBlockNoteEditor(props: PostEditorProps) {
	return <CLIENT_BLOCK_NOTE_EDITOR {...props} />;
}
