import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { readPostCommentAnchors } from '../../api';
import { postsQueryKeys } from '../keys';

import { postCommentAnchorsQueryOptions } from './query-options';

vi.mock('../../api', () => ({ readPostCommentAnchors: vi.fn() }));

describe('postCommentAnchorsQueryOptions', () => {
	it('게시글별로 조회하고 동일한 키의 최신 응답은 캐시에서 읽는다', async () => {
		const response = { status: 0, message: 'OK', data: { blocks: [] } };
		vi.mocked(readPostCommentAnchors).mockResolvedValue(response);
		const client = new QueryClient();
		const options = postCommentAnchorsQueryOptions(81);
		expect(options.queryKey).toEqual(postsQueryKeys.commentAnchors(81));
		await expect(client.fetchQuery(options)).resolves.toEqual(response);
		await expect(client.fetchQuery(options)).resolves.toEqual(response);
		expect(readPostCommentAnchors).toHaveBeenCalledExactlyOnceWith(81);
		client.clear();
	});
});
