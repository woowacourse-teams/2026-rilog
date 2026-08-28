import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const canAccessRilogSettings = (currentUserSlug: string, blogSlug: string): boolean =>
	stripAtPrefix(currentUserSlug) === stripAtPrefix(blogSlug);
