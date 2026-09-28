import { ApiErrorReporter } from './api-error-reporter';
import { errorTracker } from './error-tracker-instance';

export const apiErrorReporter = new ApiErrorReporter(errorTracker);
