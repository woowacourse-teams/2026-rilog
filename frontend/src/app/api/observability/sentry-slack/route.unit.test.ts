import { beforeEach, expect, it, vi } from 'vitest';

const { deliverSentrySlackAlert } = vi.hoisted(() => ({ deliverSentrySlackAlert: vi.fn() }));
vi.mock('@/shared/error-tracking/sentry-slack-delivery', () => ({ deliverSentrySlackAlert }));

import { POST } from './route';

const body = JSON.stringify({
	eventId: '0123456789abcdef0123456789abcdef',
	title: 'TypeError',
	errorType: 'TypeError',
	tags: { operation: 'post.publish' },
	breadcrumbs: ['fetch GET 503'],
});

beforeEach(() => {
	vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.rilog.kr');
	deliverSentrySlackAlert.mockReset();
	deliverSentrySlackAlert.mockResolvedValue(true);
});

it('같은 출처의 유효한 오류 요약이면 Slack 전송 경계에 전달한다', async () => {
	const response = await POST(
		new Request('https://www.rilog.kr/api/observability/sentry-slack', {
			method: 'POST',
			headers: { origin: 'https://www.rilog.kr', 'content-type': 'application/json' },
			body,
		}),
	);
	expect(response.status).toBe(204);
	expect(deliverSentrySlackAlert).toHaveBeenCalledOnce();
});

it('production smoke의 로컬 출처를 허용하고 Slack 전송 실패는 오류로 드러낸다', async () => {
	vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://127.0.0.1:3109');
	deliverSentrySlackAlert.mockResolvedValue(false);
	const response = await POST(
		new Request('http://127.0.0.1:3109/api/observability/sentry-slack', {
			method: 'POST',
			headers: { origin: 'http://127.0.0.1:3109', 'content-type': 'application/json' },
			body,
		}),
	);
	expect(response.status).toBe(502);
	expect(deliverSentrySlackAlert).toHaveBeenCalledOnce();
});

it('다른 출처나 임의 필드를 포함한 요청은 Slack에 전달하지 않는다', async () => {
	const wrongOrigin = await POST(
		new Request('https://www.rilog.kr/api/observability/sentry-slack', {
			method: 'POST',
			headers: { origin: 'https://elsewhere.example', 'content-type': 'application/json' },
			body,
		}),
	);
	const malformed = await POST(
		new Request('https://www.rilog.kr/api/observability/sentry-slack', {
			method: 'POST',
			headers: { origin: 'https://www.rilog.kr', 'content-type': 'application/json' },
			body: JSON.stringify({ ...JSON.parse(body), tags: { secret: 'private' } }),
		}),
	);
	expect(wrongOrigin.status).toBe(403);
	expect(malformed.status).toBe(400);
	expect(deliverSentrySlackAlert).not.toHaveBeenCalled();
});
