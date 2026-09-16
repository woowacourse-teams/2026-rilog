'use client';

import { useEffect, useRef } from 'react';

import { identifyAnalyticsUser, resetAnalyticsIdentity } from '@/shared/analytics/posthog';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';

export default function AnalyticsIdentitySubscriber() {
	const { data: response, dataUpdatedAt } = useMyInfoQuery();
	const identifiedUserIdRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		const user = response?.data;
		if (user === undefined || tokenManager.getTokenType() !== 'access') {
			return;
		}

		const userId = String(user.id);
		if (identifiedUserIdRef.current === userId) {
			return;
		}

		if (identifyAnalyticsUser(userId, { slug: user.slug, nickname: user.nickname })) {
			identifiedUserIdRef.current = userId;
		} else {
			identifiedUserIdRef.current = undefined;
		}
		// 실패를 성공으로 기억하지 않아 동일한 내 정보 재조회 후에도 다시 시도할 수 있다.
	}, [response, dataUpdatedAt]);

	useEffect(
		() =>
			tokenManager.subscribeLogout((reason) => {
				resetAnalyticsIdentity({ onlyIfIdentified: reason === 'refresh-failed' });
				identifiedUserIdRef.current = undefined;
			}),
		[],
	);

	return null;
}
