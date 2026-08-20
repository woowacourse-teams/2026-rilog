import { useMutation } from '@tanstack/react-query';

import { readUserBySlug } from '../api';

export const useReadUserBySlugMutation = () =>
	useMutation({
		mutationFn: (slug: string) => readUserBySlug({ slug }),
	});
