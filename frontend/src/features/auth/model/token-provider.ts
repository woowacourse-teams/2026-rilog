import { refreshAuthToken } from '@/shared/api/auth/refresh';

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
	refreshAccessToken: async () => {
		const token = await refreshAuthToken();

		if (token) {
			memoryAccessToken = token;
			return token;
		}

		// 재발급 실패 시 기존 토큰도 유효하지 않으므로 초기화
		memoryAccessToken = null;
		return null;
	},
};
