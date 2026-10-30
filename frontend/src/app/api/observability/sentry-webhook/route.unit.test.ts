import { createHmac } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { deliverSentrySlackAlert as deliverSlack } from '@/shared/error-tracking/sentry-slack-delivery';

const { deliverSentrySlackAlert } = vi.hoisted(() => ({
	deliverSentrySlackAlert: vi.fn<typeof deliverSlack>(),
}));
vi.mock('@/shared/error-tracking/sentry-slack-delivery', () => ({ deliverSentrySlackAlert }));

import { POST } from './route';

const secret = 'fixture-client-secret-at-least-32-characters';
const eventId = '0123456789abcdef0123456789abcdef';
let stateDirectory: string;
const payload = {
	action: 'triggered',
	data: {
		event: {
			event_id: eventId,
			project: 1,
			issue_id: '123',
			level: 'error',
			environment: 'prod',
			release: 'fixture-release',
			transaction: '/write',
			exception: { values: [{ type: 'HTTPError', value: 'Failed https://api.rilog.kr/v1/posts?token=private' }] },
			tags: [
				['environment', 'prod'],
				['operation', 'post.publish'],
				['http_status', '503'],
			],
			request: { url: 'https://www.rilog.kr/write', headers: [['Authorization', 'Bearer private']] },
			breadcrumbs: {
				values: [
					{
						category: 'fetch',
						data: { method: 'POST', url: 'https://api.rilog.kr/v1/posts?token=private', status_code: 503 },
					},
				],
			},
			web_url: 'https://attacker.example/forged',
		},
	},
};

function request(value: unknown = payload, signature?: string): Request {
	const body = JSON.stringify(value);
	return new Request('https://www.rilog.kr/api/observability/sentry-webhook', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'sentry-hook-resource': 'event_alert',
			'sentry-hook-signature': signature ?? createHmac('sha256', secret).update(body).digest('hex'),
		},
		body,
	});
}

beforeEach(async () => {
	stateDirectory = await mkdtemp(join(tmpdir(), 'rilog-sentry-webhook-test-'));
	vi.stubEnv('SENTRY_SLACK_MODE', 'webhook');
	vi.stubEnv('SENTRY_WEBHOOK_CLIENT_SECRET', secret);
	vi.stubEnv('SENTRY_WEBHOOK_PROJECT_ID', '1');
	vi.stubEnv('SENTRY_WEBHOOK_ORG', 'rilog-frontend');
	vi.stubEnv('SENTRY_SLACK_STATE_DIR', stateDirectory);
	deliverSentrySlackAlert.mockReset();
	deliverSentrySlackAlert.mockResolvedValue(true);
});

afterEach(async () => {
	vi.unstubAllEnvs();
	await rm(stateDirectory, { recursive: true, force: true });
});

it('서명된 운영 event alert만 정제하고 실제 Sentry 링크와 함께 전달한다', async () => {
	expect((await POST(request())).status).toBe(204);
	expect(deliverSentrySlackAlert).toHaveBeenCalledOnce();
	const [summary, source, options] = deliverSentrySlackAlert.mock.calls[0];
	expect(source).toBe('sentry-webhook');
	expect(options).toEqual({
		mode: 'webhook',
		eventUrl: `https://rilog-frontend.sentry.io/issues/123/events/${eventId}/`,
	});
	expect(summary).toMatchObject({ eventId, route: '/write', tags: { environment: 'prod', operation: 'post.publish' } });
	expect(JSON.stringify(summary)).not.toContain('private');
	expect(JSON.stringify(summary)).not.toContain('attacker.example');
});

it('서명 위조와 클라이언트 summary는 Slack으로 보내지 않는다', async () => {
	expect((await POST(request(payload, '0'.repeat(64)))).status).toBe(401);
	expect((await POST(request({ eventId, title: 'forged' }))).status).toBe(400);
	expect(deliverSentrySlackAlert).not.toHaveBeenCalled();
});

it('다른 프로젝트·비운영 환경·smoke release·warning은 운영 알림에서 제외한다', async () => {
	for (const override of [
		{ project: 2 },
		{ environment: 'local' },
		{ release: 'sourcemap-smoke-fixture' },
		{ level: 'warning' },
	]) {
		expect((await POST(request({ ...payload, data: { event: { ...payload.data.event, ...override } } }))).status).toBe(
			204,
		);
	}
	expect(deliverSentrySlackAlert).not.toHaveBeenCalled();
});

it('같은 이벤트의 재전송은 디스크 상태로 중복 전달을 차단한다', async () => {
	expect((await POST(request())).status).toBe(204);
	expect((await POST(request())).status).toBe(204);
	expect(deliverSentrySlackAlert).toHaveBeenCalledOnce();
});

it('Slack 실패를 성공으로 응답하지 않고 다음 전송에서 다시 시도할 수 있다', async () => {
	deliverSentrySlackAlert.mockResolvedValueOnce(false);
	expect((await POST(request())).status).toBe(503);
	expect((await POST(request())).status).toBe(204);
	expect(deliverSentrySlackAlert).toHaveBeenCalledTimes(2);
});

it('webhook 모드 또는 필수 설정이 없으면 기존 경로로 fallback하지 않는다', async () => {
	vi.stubEnv('SENTRY_WEBHOOK_CLIENT_SECRET', '');
	expect((await POST(request())).status).toBe(503);
	vi.stubEnv('SENTRY_SLACK_MODE', 'legacy');
	expect((await POST(request())).status).toBe(503);
	expect(deliverSentrySlackAlert).not.toHaveBeenCalled();
});

it('서명 대상인 원문 body가 변하면 동일한 JSON 의미여도 거부한다', async () => {
	const original = JSON.stringify(payload);
	const signature = createHmac('sha256', secret).update(original).digest('hex');
	const response = await POST(
		new Request('https://www.rilog.kr/api/observability/sentry-webhook', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'sentry-hook-resource': 'event_alert',
				'sentry-hook-signature': signature,
			},
			body: ` ${original}`,
		}),
	);
	expect(response.status).toBe(401);
	expect(deliverSentrySlackAlert).not.toHaveBeenCalled();
});

it('환경 tag와 release 객체 등 Sentry webhook 표현도 처리한다', async () => {
	const value = {
		...payload,
		data: { event: { ...payload.data.event, environment: undefined, release: { version: 'fixture-release' } } },
	};
	expect((await POST(request(value))).status).toBe(204);
	expect(deliverSentrySlackAlert.mock.calls[0]?.[0].tags).toMatchObject({
		environment: 'prod',
		release: 'fixture-release',
	});
});

it('Content-Length가 없어도 큰 body는 서명 검사 전에 크기를 제한한다', async () => {
	const response = await POST(
		new Request('https://www.rilog.kr/api/observability/sentry-webhook', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: 'x'.repeat(512 * 1024 + 1),
		}),
	);
	expect(response.status).toBe(413);
	expect(deliverSentrySlackAlert).not.toHaveBeenCalled();
});

it('서명된 설치 알림은 Slack으로 보내지 않고 확인 응답한다', async () => {
	const input = request({ action: 'created' });
	input.headers.set('sentry-hook-resource', 'installation');
	expect((await POST(input)).status).toBe(204);
	expect(deliverSentrySlackAlert).not.toHaveBeenCalled();
});

it('상태 저장소가 쓸 수 없는 경로면 Slack 전송 전에 실패한다', async () => {
	const file = join(stateDirectory, 'not-a-directory');
	await writeFile(file, 'fixture');
	vi.stubEnv('SENTRY_SLACK_STATE_DIR', file);
	expect((await POST(request())).status).toBe(503);
	expect(deliverSentrySlackAlert).not.toHaveBeenCalled();
});
