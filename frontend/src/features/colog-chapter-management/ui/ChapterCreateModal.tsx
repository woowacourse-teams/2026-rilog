'use client';

import { useId, useRef, useState } from 'react';

import type { FormEvent } from 'react';

import Input from '@/shared/ui/input/Input';
import Modal from '@/shared/ui/modal/Modal';

interface ChapterCreateModalProps {
	open: boolean;
	onClose: () => void;
	onCreate: (chapterName: string) => void;
}

export default function ChapterCreateModal({ open, onClose, onCreate }: ChapterCreateModalProps) {
	const formId = useId();
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [chapterName, setChapterName] = useState('');

	const handleClose = () => {
		setChapterName('');
		onClose();
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const normalizedChapterName = chapterName.trim();
		if (normalizedChapterName.length === 0) {
			return;
		}

		onCreate(normalizedChapterName);
		handleClose();
	};

	return (
		<Modal
			open={open}
			title="챕터 추가"
			onClose={handleClose}
			size="sm"
			initialFocusRef={inputRef}
			cancelAction={{ label: '취소' }}
			primaryAction={{
				type: 'submit',
				form: formId,
				label: '추가',
				disabled: chapterName.trim().length === 0,
			}}
		>
			<form id={formId} onSubmit={handleSubmit}>
				<label htmlFor={inputId} className="sr-only">
					챕터 이름
				</label>
				<Input
					ref={inputRef}
					id={inputId}
					value={chapterName}
					placeholder="챕터 이름을 입력해 주세요."
					onChange={(event) => setChapterName(event.target.value)}
				/>
			</form>
		</Modal>
	);
}
