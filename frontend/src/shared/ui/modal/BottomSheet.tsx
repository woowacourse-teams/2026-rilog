'use client';

import { useId, useRef } from 'react';

import type { ReactNode } from 'react';

import XIcon from '@/shared/assets/icons/x.svg';
import Button from '@/shared/ui/button/Button';

import BaseModal from './BaseModal';
import { BOTTOM_SHEET_CLASS_NAME } from './modal.styles';

interface BottomSheetProps {
	open: boolean;
	title: ReactNode;
	children: ReactNode;
	onClose: () => void;
	closeButtonLabel?: string;
}

export default function BottomSheet({
	open,
	title,
	children,
	onClose,
	closeButtonLabel = '바텀시트 닫기',
}: BottomSheetProps) {
	const titleId = useId();
	const titleRef = useRef<HTMLHeadingElement>(null);

	return (
		<BaseModal
			open={open}
			onDismiss={onClose}
			accessibility={{ labelledBy: titleId }}
			initialFocusRef={titleRef}
			className={BOTTOM_SHEET_CLASS_NAME}
		>
			<div className="flex max-h-[inherit] min-h-0 flex-col overflow-hidden">
				<header className="relative min-h-14 flex-none px-6 pt-6 pb-4">
					<h2 ref={titleRef} id={titleId} tabIndex={-1} className="pr-12 text-title-2 font-semibold text-text-primary">
						{title}
					</h2>
					<Button
						variant="ghost"
						size="icon"
						className="absolute top-4 right-4 focus-visible:-outline-offset-2"
						aria-label={closeButtonLabel}
						onClick={onClose}
					>
						<XIcon aria-hidden="true" className="size-5" />
					</Button>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
					{children}
				</div>
			</div>
		</BaseModal>
	);
}
