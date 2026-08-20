import { useMutation } from '@tanstack/react-query';

import type { OnboardingRequest } from '../types';

import { completeOnboarding } from '../api';

export const useOnboardingMutation = () => {
	return useMutation({
		mutationFn: (data: OnboardingRequest) => completeOnboarding(data),
	});
};
