export interface MyCologPreviewResponse {
	cologId: number;
	slug: string;
	name: string;
	profileImageUrl: string;
}

export interface MyInfoResponse {
	id: number;
	slug: string;
	nickname: string;
	profileImageUrl: string | null;
}
