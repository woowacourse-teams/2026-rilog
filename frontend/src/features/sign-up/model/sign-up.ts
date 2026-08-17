export interface SignUpValue {
	nickname: string;
	slug: string;
	introduction: string;
	profileImageFile: File | null;
}

export interface SignUpResult {
	slug: string;
}

export type CompleteSignUp = (value: SignUpValue) => Promise<SignUpResult>;
