export interface User {
	id: number;
	slug: string;
	nickname: string;
	profileImageUrl: string | null;
}

export interface UserDetail extends User {
	email: string;
	createdAt: string;
}
