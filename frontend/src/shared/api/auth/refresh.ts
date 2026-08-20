import ky from 'ky';

/**
 * [주의] 토큰 재발급 API 함수가 api.ts에서 분리된 이유
 *
 * api.ts는 범용 API 클라이언트인 kyInstance를 import하여 사용합니다.
 * 그런데 kyInstance는 요청 헤더에 토큰을 주입하고 만료 시 재발급을 수행하기 위해 token-provider.ts를 참조합니다.
 * 만약 토큰 재발급 함수마저 api.ts에 위치하면 아래와 같은 순환 참조(Circular Dependency)가 발생합니다.
 *
 * client.ts -> token-provider.ts -> api.ts -> client.ts
 *
 * 이로 인해 앱 초기화 시점에 'Cannot access tokenProvider before initialization' 에러가 발생하므로,
 * kyInstance(인터셉터)에 의존하지 않는 순수 ky를 사용하는 재발급 로직만 이 파일로 완전히 분리했습니다.
 */
export const refreshAuthToken = async (): Promise<string | null> => {
	const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || '';

	try {
		const response = await ky.post(`${baseUrl}/v1/auth/token/refresh`, {
			credentials: 'include',
			throwHttpErrors: false,
		});

		if (response.ok) {
			const authHeader = response.headers.get('Authorization');
			return authHeader ? authHeader.replace('Bearer ', '') : null;
		}
	} catch (error) {
		console.error('[tokenProvider] Failed to refresh token request:', error);
	}

	return null;
};
