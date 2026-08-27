'use client';

import { mapDraftListResponse } from '@/features/post-write/lib/map-draft-list-response';
import { useMyDraftListQuery } from '@/shared/api/drafts/queries/my-draft-list/use-query';

export const usePostDraftList = () =>
	useMyDraftListQuery({
		select: (data) => data.pages.flatMap(mapDraftListResponse),
	});
