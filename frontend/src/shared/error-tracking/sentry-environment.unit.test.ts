import { expect, it } from 'vitest';

import { resolveSentryEnvironment } from './sentry-environment';

const production = {
	environment: 'prod',
	dsn: 'https://public@example.invalid/1',
	siteUrl: 'https://www.rilog.kr',
};

it('명시적인 운영 환경과 운영 사이트가 있으면 수집한다', () => {
	expect(resolveSentryEnvironment(production)).toEqual({ environment: 'prod', enabled: true });
});

it('운영에서도 명시적 비활성화와 DSN 누락을 존중한다', () => {
	expect(resolveSentryEnvironment({ ...production, enabled: 'false' }).enabled).toBe(false);
	expect(resolveSentryEnvironment({ ...production, dsn: '' }).enabled).toBe(false);
});

it('운영 환경은 설정 사이트와 실제 브라우저 origin을 함께 검증한다', () => {
	for (const browserOrigin of ['http://localhost:3000', 'http://127.0.0.1:3109', 'https://preview.rilog.kr']) {
		expect(resolveSentryEnvironment({ ...production, browserOrigin }).enabled).toBe(false);
	}
	for (const siteUrl of [undefined, 'invalid', 'http://www.rilog.kr', 'https://preview.rilog.kr']) {
		expect(resolveSentryEnvironment({ ...production, siteUrl }).enabled).toBe(false);
	}
	expect(resolveSentryEnvironment({ ...production, browserOrigin: 'https://www.rilog.kr' }).enabled).toBe(true);
});

it('환경 미지정 또는 알 수 없는 환경에서는 운영 수집을 추측하지 않는다', () => {
	for (const environment of [undefined, '', 'production', 'invalid']) {
		expect(resolveSentryEnvironment({ ...production, environment, enabled: 'true' })).toEqual({
			environment: 'local',
			enabled: false,
		});
	}
});

it('비운영 환경은 명시적으로 활성화한 경우에만 해당 환경으로 수집한다', () => {
	for (const environment of ['local', 'preview', 'smoke']) {
		expect(resolveSentryEnvironment({ ...production, environment }).enabled).toBe(false);
		expect(resolveSentryEnvironment({ ...production, environment, enabled: 'true' })).toEqual({
			environment,
			enabled: true,
		});
	}
});
