'use client';

import { useEffect, useId, useRef, useState } from 'react';

import type { KeyboardEvent } from 'react';

import type { User } from '@/domains/user/model/user';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { useLogoutMutation } from '@/shared/api/auth/mutations/use-logout-mutation';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import CustomLink from '@/shared/ui/link/CustomLink';

interface MobileProfileMenuProps {
	user: User | null | undefined;
}

export default function MobileProfileMenu({ user }: MobileProfileMenuProps) {
	const menuId = useId();
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const itemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([]);
	const firstFocusIndex = useRef(0);
	const [isOpen, setIsOpen] = useState(false);
	const logout = useLogoutMutation();
	const itemCount = user?.slug ? 2 : 1;

	useEffect(() => {
		if (!isOpen) return;
		itemRefs.current[firstFocusIndex.current]?.focus();
		const handleOutsidePointer = (event: PointerEvent) => {
			if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false);
		};
		document.addEventListener('pointerdown', handleOutsidePointer);
		return () => document.removeEventListener('pointerdown', handleOutsidePointer);
	}, [isOpen]);

	const handleItemKeyDown = (event: KeyboardEvent, index: number) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			itemRefs.current[(index + (event.key === 'ArrowDown' ? 1 : -1) + itemCount) % itemCount]?.focus();
		} else if (event.key === 'Home' || event.key === 'End') {
			event.preventDefault();
			itemRefs.current[event.key === 'Home' ? 0 : itemCount - 1]?.focus();
		}
	};

	return (
		<div
			ref={rootRef}
			className="relative"
			onKeyDown={(event) => {
				if (!isOpen || event.key !== 'Escape') return;
				event.preventDefault();
				setIsOpen(false);
				triggerRef.current?.focus();
			}}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
			}}
		>
			<Button
				ref={triggerRef}
				variant="ghost"
				size="icon"
				className="size-11! rounded-full!"
				aria-label="프로필 메뉴"
				aria-haspopup="menu"
				aria-expanded={isOpen}
				aria-controls={isOpen ? menuId : undefined}
				onClick={() => {
					firstFocusIndex.current = 0;
					setIsOpen(!isOpen);
				}}
				onKeyDown={(event) => {
					if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
					event.preventDefault();
					firstFocusIndex.current = event.key === 'ArrowDown' ? 0 : itemCount - 1;
					if (isOpen) itemRefs.current[firstFocusIndex.current]?.focus();
					else setIsOpen(true);
				}}
			>
				<UserAvatar
					src={user?.profileImageUrl}
					fallback={user?.nickname.slice(0, 1).toUpperCase() ?? 'P'}
					label={user == null ? '사용자 프로필' : `${user.nickname} 프로필`}
					size="lg"
					hasBorder
				/>
			</Button>
			{isOpen && (
				<div
					id={menuId}
					role="menu"
					aria-label="프로필 메뉴"
					className="absolute top-full right-0 z-50 mt-2 min-w-36 rounded-md border border-border-default bg-surface p-1 shadow-lg"
				>
					{user?.slug && (
						<CustomLink
							ref={(element) => {
								itemRefs.current[0] = element;
							}}
							href={buildBlogHomePath(user.slug)}
							role="menuitem"
							tabIndex={-1}
							className="flex min-h-11 items-center rounded-sm px-4 text-label-1 text-text-primary hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-focus-ring"
							onClick={() => setIsOpen(false)}
							onKeyDown={(event) => handleItemKeyDown(event, 0)}
						>
							내 블로그
						</CustomLink>
					)}
					<button
						ref={(element) => {
							itemRefs.current[itemCount - 1] = element;
						}}
						type="button"
						role="menuitem"
						tabIndex={-1}
						aria-disabled={logout.isPending}
						className="flex min-h-11 w-full items-center rounded-sm px-4 text-label-1 text-danger hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-focus-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
						onClick={() => {
							if (logout.isPending) return;
							setIsOpen(false);
							triggerRef.current?.focus();
							logout.mutate();
						}}
						onKeyDown={(event) => handleItemKeyDown(event, itemCount - 1)}
					>
						로그아웃
					</button>
				</div>
			)}
		</div>
	);
}
