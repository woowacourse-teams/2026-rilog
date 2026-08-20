'use client';


import { useId, useRef, useState } from 'react';

import type { MemberInviteCandidate } from '../model/member-invite-candidate';
import type { FormEvent, KeyboardEvent } from 'react';

import Button from '@/shared/ui/button/Button';
import Input from '@/shared/ui/input/Input';
import Modal from '@/shared/ui/modal/Modal';


import { useReadUserBySlugMutation } from '@/shared/api/users/mutations/use-read-user-by-slug-mutation';

import MemberInviteCandidateRow from './MemberInviteCandidateRow';

interface MemberInviteModalProps {
	open: boolean;
	onClose: () => void;
	onInvite?: (candidates: MemberInviteCandidate[]) => void;
}

export default function MemberInviteModal({ open, onClose, onInvite }: MemberInviteModalProps) {
	const formId = useId();
	const inputId = useId();
	const helperTextId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [slugInput, setSlugInput] = useState('');
	const [candidates, setCandidates] = useState<MemberInviteCandidate[]>([]);
	const [errorMessage, setErrorMessage] = useState<string>();

	const { mutateAsync: readUserBySlug, isPending } = useReadUserBySlugMutation();

	const reset = () => {
		setSlugInput('');
		setCandidates([]);
		setErrorMessage(undefined);
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	const handleAddCandidate = async () => {
		const normalizedSlug = slugInput.trim().replace(/^@/, '');

		if (!normalizedSlug) {
			setErrorMessage('고유 아이디를 입력해 주세요.');
			return;
		}

		if (candidates.some((candidate) => candidate.slug === normalizedSlug)) {
			setErrorMessage('이미 추가한 멤버입니다.');
			return;
		}

		setErrorMessage(undefined);

		try {
			const response = await readUserBySlug(normalizedSlug);
			const user = response.data;

			if (user) {
				setCandidates((currentCandidates) => [
					...currentCandidates,
					{
						userId: user.id,
						slug: user.slug,
						nickname: user.nickname,
						profileImageUrl: user.profileImageUrl,
					},
				]);
				setSlugInput('');
				inputRef.current?.focus();
			}
		} catch {
			setErrorMessage('해당 고유 아이디의 사용자를 찾을 수 없습니다.');
		}
	};

	const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter') {
			return;
		}

		event.preventDefault();
		void handleAddCandidate();
	};

	const handleRemoveCandidate = (slug: string) => {
		setCandidates((currentCandidates) => currentCandidates.filter((candidate) => candidate.slug !== slug));
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (candidates.length === 0) {
			return;
		}

		onInvite?.(candidates);
		handleClose();
	};

	return (
		<Modal
			open={open}
			title="멤버 초대"
			description="고유 아이디로 팀원을 초대합니다. 여러 명을 한 번에 추가할 수 있어요."
			onClose={handleClose}
			size="md"
			padding="xl"
			scrollMode="custom"
			showCloseButton={false}
			initialFocusRef={inputRef}
			cancelAction={{ label: '취소' }}
			primaryAction={{
				type: 'submit',
				form: formId,
				label: '초대',
				disabled: candidates.length === 0,
			}}
		>
			<form id={formId} className="flex min-h-96 flex-col md:h-128" onSubmit={handleSubmit}>
				<div className="shrink-0">
					<label htmlFor={inputId} className="text-label-2 font-semibold text-text-primary">
						고유 아이디 입력
					</label>
					<div className="mt-2 flex items-start gap-2 rounded-md bg-surface-hover p-1.5">
						<Input
							ref={inputRef}
							id={inputId}
							value={slugInput}
							aria-label="초대할 멤버 고유 아이디"
							aria-describedby={helperTextId}
							placeholder="@jetproc"
							status={errorMessage ? 'error' : 'default'}
							className="border-0 bg-transparent px-3"
							onChange={(event) => {
								setSlugInput(event.target.value);
								setErrorMessage(undefined);
							}}
							onKeyDown={handleInputKeyDown}
						/>
						<Button
							type="button"
							size="md"
							className="shrink-0 px-5"
							disabled={!slugInput.trim()}
							isPending={isPending}
							onClick={() => void handleAddCandidate()}
						>
							추가
						</Button>
					</div>
					<p
						id={helperTextId}
						className={`mt-1.5 text-label-1 ${errorMessage ? 'text-danger' : 'text-text-secondary'}`}
						aria-live="polite"
					>
						{errorMessage ?? 'Enter로 여러 사용자 추가하세요.'}
					</p>
				</div>

				<div className="mt-10 flex min-h-0 flex-1 flex-col">
					<h3 className="shrink-0 text-label-2 font-semibold text-text-primary">추가할 멤버 정보</h3>
					{candidates.length === 0 ? (
						<p className="flex flex-1 items-center justify-center text-body-1 text-text-secondary">
							추가할 멤버가 없습니다.
						</p>
					) : (
						<ul aria-label="추가할 멤버 정보" className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-3">
							{candidates.map((candidate) => (
								<MemberInviteCandidateRow key={candidate.slug} candidate={candidate} onRemove={handleRemoveCandidate} />
							))}
						</ul>
					)}
				</div>
			</form>
		</Modal>
	);
}
