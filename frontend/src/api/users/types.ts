import type { User } from '@/domains/user/model/user';

export interface ReadUserBySlugRequest {
	slug: string;
}

export type ReadUserBySlugResponse = User;
