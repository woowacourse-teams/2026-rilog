'use client';

import { useRef } from 'react';

import type { MouseEvent, Ref } from 'react';

import Button from '@/shared/ui/button/Button';
import { getButtonClassName } from '@/shared/ui/button/button.styles';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';

type ImageEditMenuPlacement = 'top' | 'bottom';

interface ImageEditMenuProps {
	imageLabel: string;
	hasImage: boolean;
	onFileChange: (file: File) => void;
	onReset: () => void;
	disabled?: boolean;
	required?: boolean;
	inputRef?: Ref<HTMLInputElement>;
	placement?: ImageEditMenuPlacement;
	className?: string;
}

const MENU_POSITION_CLASS_NAMES: Record<ImageEditMenuPlacement, string> = {
	top: 'right-0 bottom-[calc(100%+0.5rem)]',
	bottom: 'top-[calc(100%+0.5rem)] left-0',
};

export default function ImageEditMenu({
	imageLabel,
	hasImage,
	onFileChange,
	onReset,
	disabled = false,
	required = false,
	inputRef,
	placement = 'bottom',
	className,
}: ImageEditMenuProps) {
	const detailsRef = useRef<HTMLDetailsElement>(null);
	const triggerLabel = `${imageLabel} ${hasImage ? '변경' : '추가'}`;
	const uploadLabel = `${hasImage ? `새 ${imageLabel}` : imageLabel} 업로드`;

	const closeMenu = () => detailsRef.current?.removeAttribute('open');

	const handleSummaryClick = (event: MouseEvent<HTMLElement>) => {
		if (disabled) {
			event.preventDefault();
		}
	};

	return (
		<details ref={detailsRef} className={`group ${className ?? 'relative'}`}>
			<summary
				aria-label={triggerLabel}
				aria-disabled={disabled || undefined}
				onClick={handleSummaryClick}
				className={getButtonClassName({
					size: 'md',
					variant: 'secondary',
					className: `cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden ${disabled ? 'pointer-events-none opacity-btn-disabled' : ''}`,
				})}
			>
				<span>{triggerLabel}</span>
				<span aria-hidden="true" className="transition-transform group-open:rotate-180">
					⌄
				</span>
			</summary>

			<div
				className={`absolute z-30 flex w-56 flex-col gap-1 rounded-md border border-border-default bg-surface p-1.5 shadow-sm ${MENU_POSITION_CLASS_NAMES[placement]}`}
			>
				<ImageUploader
					ref={inputRef}
					required={required}
					disabled={disabled}
					buttonLabel={uploadLabel}
					fullWidth
					className="justify-start! border-0! bg-transparent! px-3! hover:bg-surface-hover!"
					onFileChange={(file) => {
						if (file !== null) {
							onFileChange(file);
							closeMenu();
						}
					}}
				/>
				{hasImage ? (
					<Button
						variant="ghost"
						fullWidth
						className="justify-start! text-danger"
						onClick={() => {
							onReset();
							closeMenu();
						}}
					>
						기본 이미지로 되돌리기
					</Button>
				) : null}
			</div>
		</details>
	);
}
