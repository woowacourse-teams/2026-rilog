import { useMutation } from '@tanstack/react-query';

import { checkNicknameAvailability } from '@/shared/api/availability/api';

export const useCheckNicknameAvailabilityMutation = () =>
	useMutation({
		mutationFn: (nickname: string) => checkNicknameAvailability({ nickname }),
	});
