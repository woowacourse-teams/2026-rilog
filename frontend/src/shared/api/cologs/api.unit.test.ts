import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CologProfileUpdateRequest } from './types';

import { updateCologProfile } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('updateCologProfile', () => {
	it('정규화한 slug와 요청 본문으로 팀 프로필 수정 PATCH 요청을 보낸다', async () => {
		let capturedRequest: Request | undefined;
		let capturedBody: unknown;
		const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
			capturedRequest = input as Request;
			capturedBody = await capturedRequest.clone().json();
			return Response.json({ status: 200, message: '팀 프로필을 수정했습니다.' });
		});
		vi.stubGlobal('fetch', fetchMock);
		const request: CologProfileUpdateRequest = {
			name: '리로그 팀',
			profileImageUrl: 'rilog/uploads/images/logo.png',
			coverImageUrl: null,
			introduction: '함께 기록하는 팀',
			serviceUrl: null,
			githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
		};

		await updateCologProfile('@rilog/team', request);

		expect(capturedRequest?.method).toBe('PATCH');
		expect(capturedRequest?.url).toBe('https://api.rilog.test/v1/blogs/rilog%2Fteam/profiles');
		expect(capturedBody).toEqual(request);
	});
});
