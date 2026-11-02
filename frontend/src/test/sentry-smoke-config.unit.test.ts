import { expect, it } from 'vitest';

import { resolveSentrySmokeConfig } from '../../test-harness/sentry-smoke-config.mjs';

const isolated = {
	SENTRY_SMOKE_DSN: 'https://public@o0.ingest.sentry.io/2',
	SENTRY_SMOKE_PROJECT_ID: '2',
	SENTRY_SMOKE_PROJECT_SLUG: 'rilog-smoke',
	SENTRY_SMOKE_ORG: 'test-org',
};

it('명시적으로 지정한 테스트 프로젝트 DSN만 허용한다', () => {
	expect(resolveSentrySmokeConfig(isolated)).toMatchObject({ projectId: '2', project: 'rilog-smoke', org: 'test-org' });
});

it('운영 DSN fallback과 운영 프로젝트 대상은 build 전에 거부한다', () => {
	expect(() => resolveSentrySmokeConfig({ NEXT_PUBLIC_SENTRY_DSN: isolated.SENTRY_SMOKE_DSN })).toThrow();
	expect(() =>
		resolveSentrySmokeConfig({
			...isolated,
			SENTRY_SMOKE_DSN: 'https://public@o0.ingest.sentry.io/4512133995429888',
			SENTRY_SMOKE_PROJECT_ID: '4512133995429888',
		}),
	).toThrow();
	expect(() => resolveSentrySmokeConfig({ ...isolated, SENTRY_SMOKE_PROJECT_SLUG: 'rilog-frontend-nextjs' })).toThrow();
});

it('DSN과 프로젝트 ID가 다르거나 업로드 대상이 없으면 거부한다', () => {
	for (const override of [
		{ SENTRY_SMOKE_PROJECT_ID: '3' },
		{ SENTRY_SMOKE_ORG: '' },
		{ SENTRY_SMOKE_PROJECT_SLUG: '' },
	]) {
		expect(() => resolveSentrySmokeConfig({ ...isolated, ...override })).toThrow();
	}
});

it('잘못된 DSN을 진단할 때 입력값을 오류에 노출하지 않는다', () => {
	for (const dsn of [
		'secret-value',
		'http://public@o0.ingest.sentry.io/2',
		'https://public:secret@o0.ingest.sentry.io/2',
		'https://public@o0.ingest.sentry.io/2?token=secret',
	]) {
		try {
			resolveSentrySmokeConfig({ ...isolated, SENTRY_SMOKE_DSN: dsn });
			throw new Error('expected rejection');
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect(String(error)).not.toContain(dsn);
			expect(String(error)).not.toContain('secret');
			expect(String(error)).not.toContain('expected rejection');
		}
	}
});

it('운영 ID의 앞자리 0과 대문자 운영 slug로 격리 검사를 우회할 수 없다', () => {
	expect(() =>
		resolveSentrySmokeConfig({
			...isolated,
			SENTRY_SMOKE_DSN: 'https://public@o0.ingest.sentry.io/04512133995429888',
			SENTRY_SMOKE_PROJECT_ID: '04512133995429888',
		}),
	).toThrow();
	expect(() => resolveSentrySmokeConfig({ ...isolated, SENTRY_SMOKE_PROJECT_SLUG: 'RILOG-FRONTEND-NEXTJS' })).toThrow();
});
