import { initializeSentry } from '@/shared/error-tracking/initialize-sentry';

initializeSentry({ runtime: 'edge', tracesSampleRate: 1 });
