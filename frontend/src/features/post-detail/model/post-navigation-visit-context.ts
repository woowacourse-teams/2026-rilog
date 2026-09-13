'use client';

import { createContext, useContext } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';

interface PostNavigationVisitContextValue {
	chapterId: number | null;
	getNavigationVisitId: () => string;
	ownerType: BlogType;
	postId: number;
}

export const POST_NAVIGATION_VISIT_CONTEXT = createContext<PostNavigationVisitContextValue | null>(null);

export const usePostNavigationVisit = () => useContext(POST_NAVIGATION_VISIT_CONTEXT);
