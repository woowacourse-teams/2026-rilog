import { useMutation } from '@tanstack/react-query';

import { checkSlugAvailability } from '@/shared/api/availability/api';

export const useCheckSlugAvailabilityMutation = () =>
	useMutation({
		mutationFn: (slug: string) => checkSlugAvailability({ slug }),
	});
