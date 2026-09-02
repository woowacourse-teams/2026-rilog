'use client';

import { useState } from 'react';

import { mapBlogIndexResponse } from '@/features/blog-home-index/lib/map-blog-index-response';
import type { BlogHomeIndex } from '@/features/blog-home-index/model/blog-home-index';
import { useBlogIndexQuery } from '@/shared/api/blogs/queries/index/use-query';
import type { BlogIndexResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

interface UseBlogHomeIndexOptions {
	slug: string;
	initialRequestFailed?: boolean;
}

const selectBlogHomeIndex = (response: ApiResponse<BlogIndexResponse>): BlogHomeIndex => {
	if (response.data === undefined) {
		throw new Error('블로그 인덱스 응답 데이터가 없습니다.');
	}

	return mapBlogIndexResponse(response.data);
};

export const useBlogHomeIndex = ({ slug, initialRequestFailed = false }: UseBlogHomeIndexOptions) => {
	const queryIdentity = `${slug}:${initialRequestFailed}`;
	const [queryControl, setQueryControl] = useState({
		identity: queryIdentity,
		isEnabled: !initialRequestFailed,
	});
	const isQueryEnabled = queryControl.identity === queryIdentity ? queryControl.isEnabled : !initialRequestFailed;
	const query = useBlogIndexQuery({ slug, isEnabled: isQueryEnabled, select: selectBlogHomeIndex });
	const hasError = query.data === undefined && ((!isQueryEnabled && initialRequestFailed) || query.isError);

	return {
		index: query.data,
		hasError,
		isPending: query.data === undefined && !hasError && query.isPending,
		retry: () => {
			if (!isQueryEnabled) {
				setQueryControl({ identity: queryIdentity, isEnabled: true });
				return;
			}

			void query.refetch();
		},
	};
};
