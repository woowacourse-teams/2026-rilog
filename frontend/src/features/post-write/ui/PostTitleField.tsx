import { useLayoutEffect } from 'react';

import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';

interface PostTitleFieldProps {
	value: string;
	error?: string;
	inputRef: RefObject<HTMLTextAreaElement | null>;
	onChange: (value: string) => void;
	onEnter: () => void;
}

// 제목 필드와 검증 메시지를 연결하는 고정 ID
const POST_TITLE_ERROR_ID = 'post-title-error';

// 스크롤바 없이 입력한 제목 길이만큼 textarea 높이를 확장
const resizeTitleField = (element: HTMLTextAreaElement) => {
	element.style.height = 'auto';
	element.style.height = `${element.scrollHeight}px`;
};

export default function PostTitleField({ value, error, inputRef, onChange, onEnter }: PostTitleFieldProps) {
	useLayoutEffect(() => {
		if (inputRef.current !== null) {
			resizeTitleField(inputRef.current);
		}
	}, [inputRef, value]);

	// 줄바꿈을 제거한 한 문단 제목을 저장하고 현재 내용에 맞춰 높이 조절
	const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		onChange(event.currentTarget.value.replaceAll('\n', ''));
	};

	// 제목에서 Enter를 누르면 줄바꿈 대신 본문 에디터로 이동
	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			onEnter();
		}
	};

	return (
		<div>
			<textarea
				ref={inputRef}
				rows={1}
				maxLength={512}
				value={value}
				aria-label="게시글 제목"
				aria-invalid={error !== undefined}
				aria-describedby={error === undefined ? undefined : POST_TITLE_ERROR_ID}
				className="w-full resize-none overflow-hidden bg-transparent text-heading-2 font-semibold text-text-primary outline-none placeholder:text-text-disabled sm:text-heading-1"
				placeholder="제목을 입력하세요"
				onChange={handleChange}
				onKeyDown={handleKeyDown}
			/>
			{error !== undefined && (
				<p id={POST_TITLE_ERROR_ID} className="mt-2 text-body-1 text-danger-text" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
