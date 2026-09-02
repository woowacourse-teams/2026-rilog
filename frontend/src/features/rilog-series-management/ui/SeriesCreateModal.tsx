'use client';

import { useId, useRef, useState } from 'react';

import type { FormEvent } from 'react';

import { CHAPTER_NAME_MAX_LENGTH } from '@/features/chapter-management/model/chapter';
import Input from '@/shared/ui/input/Input';
import Modal from '@/shared/ui/modal/Modal';

interface SeriesCreateModalProps {
	open: boolean;
	onClose: () => void;
	onCreate: (seriesName: string) => Promise<void>;
	isPending?: boolean;
	errorMessage?: string;
}

export default function SeriesCreateModal({
	open,
	onClose,
	onCreate,
	isPending = false,
	errorMessage,
}: SeriesCreateModalProps) {
	const formId = useId();
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [seriesName, setSeriesName] = useState('');

	const handleClose = () => {
		setSeriesName('');
		onClose();
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const normalizedSeriesName = seriesName.trim();
		if (normalizedSeriesName.length === 0) {
			return;
		}

		try {
			await onCreate(normalizedSeriesName);
			handleClose();
		} catch {
			// mutation 오류는 모달 입력 아래에 표시한다.
		}
	};

	return (
		<Modal
			open={open}
			title="시리즈 추가"
			onClose={handleClose}
			size="sm"
			isPending={isPending}
			initialFocusRef={inputRef}
			cancelAction={{ label: '취소' }}
			primaryAction={{
				type: 'submit',
				form: formId,
				label: '추가',
				disabled: seriesName.trim().length === 0,
			}}
		>
			<form id={formId} onSubmit={(event) => void handleSubmit(event)}>
				<label htmlFor={inputId} className="sr-only">
					시리즈 이름
				</label>
				<Input
					ref={inputRef}
					id={inputId}
					value={seriesName}
					maxLength={CHAPTER_NAME_MAX_LENGTH}
					placeholder="시리즈 이름을 입력해 주세요."
					disabled={isPending}
					onChange={(event) => setSeriesName(event.target.value)}
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
