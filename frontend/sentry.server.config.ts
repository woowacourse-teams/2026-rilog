import { initializeSentry } from '@/shared/error-tracking/initialize-sentry';

initializeSentry({ tracesSampleRate: 1 });
