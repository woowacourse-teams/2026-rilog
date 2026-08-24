'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';

interface PostWriteAccessGuardProps {
	authorId: number;
	children: ReactNode;
}

const guardClassName = 'flex min-h-dvh items-center justify-center bg-background px-6 text-center';

export default function PostWriteAccessGuard({ authorId, children }: PostWriteAccessGuardProps) {
	const router = useRouter();
	const { isAuthenticated, isInitialized } = useAuth();
	const hasRedirectedRef = useRef(false);
	const myInfoQuery = useMyInfoQuery({ isEnabled: isInitialized && isAuthenticated });
	const isAccessDenied =
		isInitialized &&
		(!isAuthenticated || (myInfoQuery.data?.data !== undefined && myInfoQuery.data.data.id !== authorId));

	useEffect(() => {
		if (!isAccessDenied || hasRedirectedRef.current) {
			return;
		}

		hasRedirectedRef.current = true;
		if (window.history.length > 1) {
			router.back();
			return;
		}

		router.replace('/');
	}, [isAccessDenied, router]);

	if (isAccessDenied) {
		return (
			<div className={guardClassName} role="status">
				이전 페이지로 이동하고 있어요.
			</div>
		);
	}

	if (!isInitialized || myInfoQuery.isPending) {
		return (
			<div className={guardClassName} role="status">
				게시글 수정 권한을 확인하고 있어요.
			</div>
		);
	}

	if (myInfoQuery.isError || myInfoQuery.data?.data === undefined) {
		return (
			<div className={guardClassName} role="alert">
				게시글 수정 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.
			</div>
		);
	}

	return children;
}
