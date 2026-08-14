'use client';

import { ko } from '@blocknote/core/locales';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import { useEffect, useImperativeHandle } from 'react';

import type { PostEditorProps } from '../model/post-editor';

import '@blocknote/shadcn/style.css';
import '../styles/blocknote-theme.css';

export default function BlockNoteEditor({ onChange, onReady, uploadFile, ariaDescribedBy, ref }: PostEditorProps) {
	// 한국어 UI와 외부에서 주입한 이미지 uploader를 적용한 에디터
	const editor = useCreateBlockNote(
		{
			dictionary: {
				...ko,
				placeholders: {
					...ko.placeholders,
					default: '내용을 입력하세요. /를 입력하면 블록을 선택할 수 있습니다.',
				},
			},
			uploadFile,
		},
		[uploadFile],
	);

	// 제목에서 Enter를 누르거나 검증에 실패했을 때 실제 에디터로 focus할 수 있도록 useImperativeHandle(리모콘 역할) 사용
	useImperativeHandle(ref, () => ({
		focus: () => editor.focus(),
	}));

	// 에디터 생성이 끝나면 초기 문서를 부모에 전달해 발행 가능 상태로 전환
	useEffect(() => {
		onReady([...editor.document]);
	}, [editor, onReady]);

	// BlockNote가 생성한 실제 editable element에 접근성 이름과 오류 메시지 연결
	useEffect(() => {
		const editorElement = editor.domElement;
		if (editorElement === undefined) {
			return;
		}

		editorElement.setAttribute('aria-label', '게시글 내용');
		if (ariaDescribedBy === undefined) {
			editorElement.removeAttribute('aria-describedby');
		} else {
			editorElement.setAttribute('aria-describedby', ariaDescribedBy);
		}
	}, [ariaDescribedBy, editor]);

	return (
		<div className="post-write-blocknote">
			<BlockNoteView editor={editor} theme="light" onChange={() => onChange([...editor.document])} />
		</div>
	);
}
