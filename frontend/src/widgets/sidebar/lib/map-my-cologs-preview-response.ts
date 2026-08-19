import type { ApiResponse } from '@/shared/api/shared.types';
import type { MyCologPreviewResponse } from '@/shared/api/users/types';

export interface MyCologPreview {
	id: number;
	slug: string;
	name: string;
	logoUrl: string | null;
}

export const mapMyCologsPreviewResponse = (response: ApiResponse<MyCologPreviewResponse[]>): MyCologPreview[] => {
	if (!response.data) return [];
	return response.data.map((colog) => ({
		id: colog.cologId,
		slug: colog.slug,
		name: colog.name,
		logoUrl: colog.profileImageUrl,
	}));
};
