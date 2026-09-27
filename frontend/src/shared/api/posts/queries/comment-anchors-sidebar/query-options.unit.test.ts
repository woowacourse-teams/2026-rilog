import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { readPostCommentAnchorsSidebar } from '../../api';
import { postsQueryKeys } from '../keys';

import { postCommentAnchorsSidebarQueryOptions } from './query-options';

vi.mock('../../api', () => ({ readPostCommentAnchorsSidebar: vi.fn() }));

describe('postCommentAnchorsSidebarQueryOptions', () => {
	it('게시글별로 조회하고 동일한 키의 최신 응답은 캐시에서 읽는다', async () => {
		const response = { status: 0, message: 'OK', data: { anchorGroups: [] } };
		vi.mocked(readPostCommentAnchorsSidebar).mockResolvedValue(response);
		const client = new QueryClient();
		const options = postCommentAnchorsSidebarQueryOptions(81);
		expect(options.queryKey).toEqual(postsQueryKeys.commentAnchorsSidebar(81));
		await expect(client.fetchQuery(options)).resolves.toEqual(response);
		await expect(client.fetchQuery(options)).resolves.toEqual(response);
		expect(readPostCommentAnchorsSidebar).toHaveBeenCalledExactlyOnceWith(81);
		client.clear();
	});
});
