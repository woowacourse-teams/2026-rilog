import type { AboutPageAcquisitionSource } from '@/features/analytics/model/analytics-event';

export const getAboutPageAcquisitionSource = (search: string): AboutPageAcquisitionSource => {
	const searchParams = new URLSearchParams(search);

	return searchParams.get('utm_source') === 'pre_registration' && searchParams.get('utm_medium') === 'email'
		? 'pre_registration_email'
		: 'unattributed';
};
