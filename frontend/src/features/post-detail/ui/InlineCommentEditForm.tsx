'use client';

import { useEffect, useRef, useState } from 'react';

import Button from '@/shared/ui/button/Button';
import Textarea from '@/shared/ui/textarea/Textarea';

interface InlineCommentEditFormProps {
	content: string;
	onCancel: () => void;
}

export default function InlineCommentEditForm({ content, onCancel }: InlineCommentEditFormProps) {
	const [value, setValue] = useState(content);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		const input = inputRef.current;
		input?.focus();
		input?.setSelectionRange(input.value.length, input.value.length);
	}, []);

	return (
		<>
			<Textarea
				ref={inputRef}
				aria-label="댓글 수정"
				rows={1}
				value={value}
				onChange={(event) => setValue(event.target.value)}
				style={{
					fieldSizing: 'content',
					height: 'auto',
					minHeight: 'calc(1lh + 1rem + 2px)',
					maxHeight: 'calc(20lh + 1rem + 2px)',
					resize: 'none',
					overflowY: 'auto',
				}}
			/>
			<div className="mt-2 flex justify-end gap-2">
				<Button variant="ghost" size="sm" onClick={onCancel}>
					취소
				</Button>
				{/* 수정 API 연결 전에는 저장 완료로 표시하지 않는다. */}
				<Button size="sm" disabled>
					저장
				</Button>
			</div>
		</>
	);
}
