'use client';

import { useRef, useState, useSyncExternalStore } from 'react';

import type { ReleaseNote } from '../model/release-notes';

import Button from '@/shared/ui/button/Button';
import Modal from '@/shared/ui/modal/Modal';

import {
	dismissReleaseNote,
	getServerReleaseNoteVisibility,
	shouldShowReleaseNote,
	subscribeReleaseNote,
} from '../model/release-note-storage';
import { getLatestReleaseNote, RELEASE_NOTES } from '../model/release-notes';

export default function ReleaseNoteModal() {
	const note = getLatestReleaseNote(RELEASE_NOTES);
	return note ? <CurrentReleaseNoteModal key={note.id} note={note} /> : null;
}

function CurrentReleaseNoteModal({ note }: { note: ReleaseNote }) {
	const [isDismissed, setIsDismissed] = useState(false);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const isVisible = useSyncExternalStore(
		subscribeReleaseNote,
		() => shouldShowReleaseNote(note.id),
		getServerReleaseNoteVisibility,
	);
	const close = (permanently = false) => {
		dismissReleaseNote(note.id, permanently);
		setIsDismissed(true);
	};

	return (
		<Modal
			open={isVisible && !isDismissed}
			title={note.title}
			description={<time dateTime={note.publishedAt}>{note.publishedAt}</time>}
			onClose={() => close()}
			closeOnBackdrop={false}
			closeOnEscape={false}
			initialFocusRef={closeButtonRef}
			padding="md"
			footer={
				<div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
					<Button variant="secondary" onClick={() => close(true)}>
						이 업데이트 다시 보지 않기
					</Button>
					<Button ref={closeButtonRef} onClick={() => close()}>
						닫기
					</Button>
				</div>
			}
		>
			<ul className="space-y-6">
				{note.items.map((item, index) => (
					<li key={index} className="wrap-break-word">
						<h3 className="text-body-2 font-semibold text-text-primary">{item.title}</h3>
						<p className="mt-2 text-body-1 whitespace-pre-wrap text-text-secondary">{item.description}</p>
					</li>
				))}
			</ul>
		</Modal>
	);
}
