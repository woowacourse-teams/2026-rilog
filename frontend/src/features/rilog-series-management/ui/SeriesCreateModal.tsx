'use client';

import { useId, useRef, useState } from 'react';

import type { FormEvent } from 'react';

import Input from '@/shared/ui/input/Input';
import Modal from '@/shared/ui/modal/Modal';

interface SeriesCreateModalProps {
	open: boolean;
	onClose: () => void;
	onCreate: (seriesName: string) => void;
}

export default function SeriesCreateModal({ open, onClose, onCreate }: SeriesCreateModalProps) {
	const formId = useId();
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [seriesName, setSeriesName] = useState('');

	const handleClose = () => {
		setSeriesName('');
		onClose();
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const normalizedSeriesName = seriesName.trim();
		if (normalizedSeriesName.length === 0) {
			return;
		}

		onCreate(normalizedSeriesName);
		handleClose();
	};

	return (
		<Modal
			open={open}
			title="시리즈 추가"
			onClose={handleClose}
			size="sm"
			initialFocusRef={inputRef}
			cancelAction={{ label: '취소' }}
			primaryAction={{
				type: 'submit',
				form: formId,
				label: '추가',
				disabled: seriesName.trim().length === 0,
			}}
		>
			<form id={formId} onSubmit={handleSubmit}>
				<label htmlFor={inputId} className="sr-only">
					시리즈 이름
				</label>
				<Input
					ref={inputRef}
					id={inputId}
					value={seriesName}
					placeholder="시리즈 이름을 입력해 주세요."
					onChange={(event) => setSeriesName(event.target.value)}
				/>
			</form>
		</Modal>
	);
}
