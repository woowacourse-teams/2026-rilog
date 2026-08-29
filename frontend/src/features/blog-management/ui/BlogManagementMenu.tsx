'use client';

import { useEffect, useId, useRef, useState } from 'react';

import type { KeyboardEvent } from 'react';

import MeatballIcon from '@/shared/assets/icons/meatball.svg';
import Button from '@/shared/ui/button/Button';
import CustomLink from '@/shared/ui/link/CustomLink';

interface BlogManagementMenuProps {
	ariaLabel: string;
	onLeave?: () => void;
	settingsHref?: string;
	showLeave?: boolean;
	triggerColor?: string;
}

export default function BlogManagementMenu({
	ariaLabel,
	onLeave,
	settingsHref,
	showLeave = false,
	triggerColor = 'var(--text-on-dark)',
}: BlogManagementMenuProps) {
	const menuId = useId();
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const itemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([]);
	const [isOpen, setIsOpen] = useState(false);
	const hasMenuItem = settingsHref !== undefined || showLeave;
	const menuItemCount = Number(settingsHref !== undefined) + Number(showLeave);
	const leaveItemIndex = settingsHref === undefined ? 0 : 1;

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleOutsidePointerDown = (event: PointerEvent) => {
			if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('pointerdown', handleOutsidePointerDown);
		return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
	}, [isOpen]);

	if (!hasMenuItem) {
		return null;
	}

	const focusMenuItem = (index: number) => {
		itemRefs.current[index]?.focus();
	};

	const openAndFocusItem = (index: number) => {
		setIsOpen(true);
		requestAnimationFrame(() => focusMenuItem(index));
	};

	const handleItemKeyDown = (event: KeyboardEvent, currentIndex: number) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const direction = event.key === 'ArrowDown' ? 1 : -1;
			focusMenuItem((currentIndex + direction + menuItemCount) % menuItemCount);
		} else if (event.key === 'Home' || event.key === 'End') {
			event.preventDefault();
			focusMenuItem(event.key === 'Home' ? 0 : menuItemCount - 1);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			setIsOpen(false);
			triggerRef.current?.focus();
		}
	};

	const handleLeave = () => {
		setIsOpen(false);
		onLeave?.();
	};

	return (
		<div ref={rootRef} className="relative inline-flex">
			<Button
				ref={triggerRef}
				type="button"
				variant="ghost"
				size="icon"
				aria-label={ariaLabel}
				aria-controls={menuId}
				aria-expanded={isOpen}
				aria-haspopup="menu"
				className="size-7! bg-transparent focus-within:bg-surface/20 hover:bg-surface/20 active:bg-surface/30"
				style={{ color: triggerColor }}
				onClick={() => setIsOpen((isCurrentlyOpen) => !isCurrentlyOpen)}
				onKeyDown={(event) => {
					if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
						event.preventDefault();
						openAndFocusItem(event.key === 'ArrowDown' ? 0 : menuItemCount - 1);
					} else if (event.key === 'Escape' && isOpen) {
						setIsOpen(false);
					}
				}}
			>
				<MeatballIcon aria-hidden="true" focusable="false" className="size-5" />
			</Button>

			{isOpen && (
				<div
					id={menuId}
					role="menu"
					aria-label={ariaLabel}
					className="absolute top-full left-0 z-30 mt-2 min-w-30 overflow-hidden rounded-md border border-border-default bg-surface px-1 py-1.5 text-left shadow-lg"
				>
					{settingsHref !== undefined && (
						<CustomLink
							ref={(element) => {
								itemRefs.current[0] = element;
							}}
							href={settingsHref}
							role="menuitem"
							className="block rounded-sm px-4 py-2 text-label-2 text-text-primary transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-focus-ring active:bg-surface-active"
							onKeyDown={(event) => handleItemKeyDown(event, 0)}
						>
							설정
						</CustomLink>
					)}
					{showLeave && (
						<button
							ref={(element) => {
								itemRefs.current[leaveItemIndex] = element;
							}}
							type="button"
							role="menuitem"
							className="block w-full rounded-sm px-4 py-2 text-left text-label-2 text-danger transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-focus-ring active:bg-surface-active"
							onClick={handleLeave}
							onKeyDown={(event) => handleItemKeyDown(event, leaveItemIndex)}
						>
							탈퇴
						</button>
					)}
				</div>
			)}
		</div>
	);
}
