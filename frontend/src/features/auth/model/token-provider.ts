let memoryAccessToken: string | null = null;

// 개발 편의를 위해 초기 로드 시 마스터 토큰이 존재하면 기본값으로 세팅
if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEV_MASTER_TOKEN) {
	memoryAccessToken = process.env.NEXT_PUBLIC_DEV_MASTER_TOKEN;
}

export const tokenProvider = {
	getAccessToken: () => memoryAccessToken,
	setAccessToken: (token: string) => {
		memoryAccessToken = token;
	},
	clearAccessToken: () => {
		memoryAccessToken = null;
	},
	refreshAccessToken: () => {
		// TODO: 실제 백엔드 연동 시 HttpOnly 쿠키의 Refresh Token을 이용해 Access Token 재발급 로직 구현
		return Promise.resolve(null);
	},
};
