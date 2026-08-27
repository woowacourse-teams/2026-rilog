export const USER_NICKNAME_MIN_LENGTH = 2;
export const USER_NICKNAME_MAX_LENGTH = 20;
export const USER_SLUG_MIN_LENGTH = 4;
export const USER_SLUG_MAX_LENGTH = 20;
export const USER_SLUG_PATTERN = '[A-Za-z0-9_\\-]+';

const SLUG_PATTERN = new RegExp(`^(?:${USER_SLUG_PATTERN})$`);

export const normalizeUserNickname = (nickname: string): string => nickname.trim();

export const normalizeUserSlug = (slug: string): string => slug.trim();

export const validateUserNickname = (nickname: string): string | undefined => {
	const normalizedNickname = normalizeUserNickname(nickname);

	if (normalizedNickname.length < USER_NICKNAME_MIN_LENGTH || normalizedNickname.length > USER_NICKNAME_MAX_LENGTH) {
		return `닉네임은 ${USER_NICKNAME_MIN_LENGTH}~${USER_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`;
	}

	return undefined;
};

export const validateUserSlug = (slug: string): string | undefined => {
	const normalizedSlug = normalizeUserSlug(slug);

	if (
		normalizedSlug.length < USER_SLUG_MIN_LENGTH ||
		normalizedSlug.length > USER_SLUG_MAX_LENGTH ||
		!SLUG_PATTERN.test(normalizedSlug)
	) {
		return '고유 아이디는 4~20자의 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있어요.';
	}

	return undefined;
};
