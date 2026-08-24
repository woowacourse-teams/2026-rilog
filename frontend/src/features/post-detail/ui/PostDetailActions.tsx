'use client';

import { useAuth } from '@/features/auth/model/use-auth';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';

interface PostDetailActionsProps {
	authorId: number;
	postId: number;
}

export default function PostDetailActions({ authorId }: PostDetailActionsProps) {
	const { isAuthenticated, isInitialized } = useAuth();
	const myInfoQuery = useMyInfoQuery({ isEnabled: isInitialized });
	const isAuthor = isInitialized && isAuthenticated && myInfoQuery.data?.data?.id === authorId;

	if (!isAuthor) {
		return null;
	}

	return (
		<div className="absolute top-1/2 right-0 flex -translate-y-1/2 gap-2">
			<button>수정</button>
			<button>삭제</button>
		</div>
	);
}
