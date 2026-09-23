import { describe, expect, it } from 'vitest';

import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

import { usersQueryKeys } from './keys';

describe('usersQueryKeys', () => {
	it('인증 사용자 조회와 공개 사용자 조회 cache를 구분한다', () => {
		expect(usersQueryKeys.myInfo()).toEqual([...authenticatedQueryKeys.all, 'users', 'me']);
		expect(usersQueryKeys.myCologsOverview()).toEqual([
			...authenticatedQueryKeys.all,
			'users',
			'me',
			'cologs',
			'overview',
		]);
		expect(usersQueryKeys.userBySlug('jetproc')).toEqual([
			...authenticatedQueryKeys.all,
			'users',
			'user-by-slug',
			'jetproc',
		]);
	});
});
