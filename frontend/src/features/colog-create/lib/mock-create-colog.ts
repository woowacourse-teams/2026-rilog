import type { CreateColog } from '../model/colog-create';

const MOCK_CREATE_DELAY_MS = 600;

export const mockCreateColog: CreateColog = async ({ slug }) => {
	await new Promise((resolve) => window.setTimeout(resolve, MOCK_CREATE_DELAY_MS));

	if (process.env.NEXT_PUBLIC_MOCK_COLOG_CREATE_FAILURE === 'true') {
		throw new Error('팀을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
	}

	return { slug };
};
