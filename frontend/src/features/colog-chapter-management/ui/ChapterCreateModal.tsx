'use client';

import { useId, useRef, useState } from 'react';

import type { FormEvent } from 'react';

import Input from '@/shared/ui/input/Input';
import Modal from '@/shared/ui/modal/Modal';

interface ChapterCreateModalProps {
	open: boolean;
	onClose: () => void;
	onCreate: (chapterName: string) => Promise<void>;
	isPending?: boolean;
	errorMessage?: string;
}

export default function ChapterCreateModal({
	open,
	onClose,
	onCreate,
	isPending = false,
	errorMessage,
}: ChapterCreateModalProps) {
	const formId = useId();
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [chapterName, setChapterName] = useState('');

	const handleClose = () => {
		setChapterName('');
		onClose();
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const normalizedChapterName = chapterName.trim();
		if (normalizedChapterName.length === 0) {
			return;
		}

		try {
			await onCreate(normalizedChapterName);
			handleClose();
		} catch {
			// mutation 오류는 모달 입력 아래에 표시한다.
		}
	};

	return (
		<Modal
			open={open}
			title="챕터 추가"
			onClose={handleClose}
			size="sm"
			isPending={isPending}
			initialFocusRef={inputRef}
			cancelAction={{ label: '취소' }}
			primaryAction={{
				type: 'submit',
				form: formId,
				label: '추가',
				disabled: chapterName.trim().length === 0,
			}}
		>
			<form id={formId} onSubmit={(event) => void handleSubmit(event)}>
				<label htmlFor={inputId} className="sr-only">
					챕터 이름
				</label>
				<Input
					ref={inputRef}
					id={inputId}
					value={chapterName}
					placeholder="챕터 이름을 입력해 주세요."
					disabled={isPending}
					onChange={(event) => setChapterName(event.target.value)}
				/>
				{errorMessage !== undefined && (
					<p className="mt-2 text-label-2 text-danger" role="alert">
						{errorMessage}
					</p>
				)}
			</form>
		</Modal>
	);
}
