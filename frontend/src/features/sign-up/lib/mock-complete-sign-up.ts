import type { CompleteSignUp } from '../model/sign-up';

const MOCK_SIGN_UP_DELAY_MS = 600;

export const mockCompleteSignUp: CompleteSignUp = async ({ slug }) => {
	await new Promise((resolve) => window.setTimeout(resolve, MOCK_SIGN_UP_DELAY_MS));

	if (process.env.NEXT_PUBLIC_MOCK_SIGN_UP_FAILURE === 'true') {
		throw new Error('회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
	}

	return { slug };
};
