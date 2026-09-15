import { afterEach, describe, expect, it, vi } from 'vitest';

import { logNonProductionError, logNonProductionInfo, logNonProductionWarning } from './non-production-console';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('non-production console', () => {
	it('프로덕션이 아니면 console 출력을 전달한다', () => {
		vi.stubEnv('NODE_ENV', 'development');
		const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		logNonProductionInfo('정보');
		logNonProductionWarning('경고');
		logNonProductionError('오류');

		expect(log).toHaveBeenCalledWith('정보');
		expect(warn).toHaveBeenCalledWith('경고');
		expect(error).toHaveBeenCalledWith('오류');
	});

	it('프로덕션에서는 모든 console 출력을 생략한다', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		logNonProductionInfo('정보');
		logNonProductionWarning('경고');
		logNonProductionError('오류');

		expect(log).not.toHaveBeenCalled();
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
	});
});
