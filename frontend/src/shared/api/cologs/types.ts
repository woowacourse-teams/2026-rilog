export interface CologCreateRequest {
	name: string;
	slug: string;
	introduction?: string;
	profileImageUrl?: string;
	coverImageUrl?: string;
	serviceUrl?: string;
	githubUrl?: string;
}

export interface CologCreateResponse {
	id: number;
	name: string;
	slug: string;
}
