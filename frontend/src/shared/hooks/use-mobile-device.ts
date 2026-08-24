'use client';

import { useEffect, useState } from 'react';

export interface UseMobileDeviceResult {
	isMobileDevice: boolean;
	isResolved: boolean;
}

const MOBILE_VIEWPORT_QUERY = '(max-width: 767px)';
const MOBILE_USER_AGENT_PATTERN = /Android|iPhone|iPad|iPod|Mobi/i;
const INITIAL_RESULT: UseMobileDeviceResult = { isMobileDevice: false, isResolved: false };

const getMobileDeviceValue = (): boolean | undefined => {
	const navigatorWithUserAgentData = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
	const userAgentDataMobile = navigatorWithUserAgentData.userAgentData?.mobile;

	if (typeof userAgentDataMobile === 'boolean') {
		return userAgentDataMobile;
	}

	if (
		MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	) {
		return true;
	}

	return undefined;
};

export const useMobileDevice = (): UseMobileDeviceResult => {
	const [result, setResult] = useState<UseMobileDeviceResult>(INITIAL_RESULT);

	useEffect(() => {
		const viewportQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
		const mobileDeviceValue = getMobileDeviceValue();
		const updateResult = () => {
			setResult({
				isMobileDevice: mobileDeviceValue ?? viewportQuery.matches,
				isResolved: true,
			});
		};

		updateResult();
		viewportQuery.addEventListener('change', updateResult);

		return () => viewportQuery.removeEventListener('change', updateResult);
	}, []);

	return result;
};
