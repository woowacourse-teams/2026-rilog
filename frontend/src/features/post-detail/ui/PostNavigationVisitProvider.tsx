'use client';

import { useCallback, useRef } from 'react';

import type { ReactNode } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';

import { POST_NAVIGATION_VISIT_CONTEXT } from '../model/post-navigation-visit-context';

interface PostNavigationVisitProviderProps {
	chapterId: number | null;
	children: ReactNode;
	ownerType: BlogType;
	postId: number;
}

export default function PostNavigationVisitProvider({
	chapterId,
	children,
	ownerType,
	postId,
}: PostNavigationVisitProviderProps) {
	const navigationVisitIdRef = useRef<string | null>(null);
	const getNavigationVisitId = useCallback(() => {
		navigationVisitIdRef.current ??= window.crypto.randomUUID();
		return navigationVisitIdRef.current;
	}, []);

	return (
		<POST_NAVIGATION_VISIT_CONTEXT.Provider value={{ chapterId, getNavigationVisitId, ownerType, postId }}>
			{children}
		</POST_NAVIGATION_VISIT_CONTEXT.Provider>
	);
}
