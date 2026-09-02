import type { ApiResponse } from '@/shared/api/shared.types';
import type { MyCologOverviewResponse } from '@/shared/api/users/types';

export interface MyCologOverview {
	id: number;
	slug: string;
	name: string;
	logoUrl: string | null;
}

export const mapMyCologsOverviewResponse = (response: ApiResponse<MyCologOverviewResponse[]>): MyCologOverview[] => {
	if (!response.data) return [];
	return response.data.map((colog) => ({
		id: colog.cologId,
		slug: colog.slug,
		name: colog.name,
		logoUrl: colog.profileImageUrl,
	}));
};
