import { initializeSentry } from '@/shared/error-tracking/initialize-sentry';
import { initializeAnalytics } from '@/shared/analytics/posthog';

initializeSentry();
initializeAnalytics();
