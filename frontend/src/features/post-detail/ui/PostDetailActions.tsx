'use client';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth/model/use-auth';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';

interface PostDetailActionsProps {
	authorId: number;
	postId: number;
}

export default function PostDetailActions({ authorId, postId }: PostDetailActionsProps) {
	const router = useRouter();
	const { isAuthenticated, isInitialized } = useAuth();
	const myInfoQuery = useMyInfoQuery({ isEnabled: isInitialized });
	const isAuthor = isInitialized && isAuthenticated && myInfoQuery.data?.data?.id === authorId;

	if (!isAuthor) {
		return null;
	}

	const handleEdit = () => {
		router.push(`/write?postId=${postId}`);
	};

	return (
		<div className="absolute top-1/2 right-0 flex -translate-y-1/2 gap-2">
			<button onClick={handleEdit}>수정</button>
			<button>삭제</button>
		</div>
	);
}
