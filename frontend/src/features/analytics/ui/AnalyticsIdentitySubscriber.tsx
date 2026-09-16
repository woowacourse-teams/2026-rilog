'use client';

import { useEffect, useRef } from 'react';

import { identifyAnalyticsUser, resetAnalyticsIdentity } from '@/shared/analytics/posthog';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';

export default function AnalyticsIdentitySubscriber() {
	const { data: response } = useMyInfoQuery();
	const identifiedUserIdRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		const user = response?.data;
		if (user === undefined) {
			return;
		}

		const userId = String(user.id);
		if (identifiedUserIdRef.current === userId) {
			return;
		}

		// 다른 계정으로 바뀌면 이전 Person과 이벤트가 연결되지 않게 초기화한다.
		if (identifiedUserIdRef.current !== undefined) {
			resetAnalyticsIdentity();
		}

		identifyAnalyticsUser(userId, { slug: user.slug, nickname: user.nickname });
		identifiedUserIdRef.current = userId;
	}, [response]);

	useEffect(
		() =>
			tokenManager.subscribeLogout(() => {
				resetAnalyticsIdentity();
				identifiedUserIdRef.current = undefined;
			}),
		[],
	);

	return null;
}
