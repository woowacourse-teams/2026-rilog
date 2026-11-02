import { isAbsolute } from 'node:path';

import { NextResponse } from 'next/server';

import { deliverSentrySlackAlert } from '@/shared/error-tracking/sentry-slack-delivery';
import { resolveSentrySlackMode } from '@/shared/error-tracking/sentry-slack-mode';
import { parseSentryWebhook, verifySentryWebhookSignature } from '@/shared/error-tracking/sentry-webhook';
import { deliverSentryWebhookOnce } from '@/shared/error-tracking/sentry-webhook-delivery-state';

export const runtime = 'nodejs';
const MAX_BODY_BYTES = 512 * 1024;

async function readBody(request: Request): Promise<Uint8Array | null> {
	const reader = request.body?.getReader();
	if (!reader) return new Uint8Array();
	const chunks: Uint8Array[] = [];
	let length = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			length += value.byteLength;
			if (length > MAX_BODY_BYTES) {
				await reader.cancel();
				return null;
			}
			chunks.push(value);
		}
		return Buffer.concat(chunks);
	} finally {
		reader.releaseLock();
	}
}

export async function POST(request: Request): Promise<NextResponse> {
	const mode = resolveSentrySlackMode(process.env.SENTRY_SLACK_MODE ?? process.env.NEXT_PUBLIC_SENTRY_SLACK_MODE);
	const secret = process.env.SENTRY_WEBHOOK_CLIENT_SECRET;
	const projectId = process.env.SENTRY_WEBHOOK_PROJECT_ID;
	const org = process.env.SENTRY_WEBHOOK_ORG;
	const directory = process.env.SENTRY_SLACK_STATE_DIR;
	const environment = process.env.SENTRY_WEBHOOK_ENVIRONMENT ?? 'prod';
	if (
		mode !== 'webhook' ||
		!secret ||
		secret.length < 32 ||
		!projectId ||
		!/^[1-9]\d*$/.test(projectId) ||
		!org ||
		!/^[a-z0-9_-]+$/.test(org) ||
		!directory ||
		!isAbsolute(directory) ||
		(environment !== 'prod' && environment !== 'smoke')
	)
		return new NextResponse(null, { status: 503 });
	if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
		return new NextResponse(null, { status: 415 });
	if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES)
		return new NextResponse(null, { status: 413 });
	try {
		const body = await readBody(request);
		if (!body) return new NextResponse(null, { status: 413 });
		if (!verifySentryWebhookSignature(body, request.headers.get('sentry-hook-signature'), secret))
			return new NextResponse(null, { status: 401 });
		if (request.headers.get('sentry-hook-resource') !== 'event_alert') return new NextResponse(null, { status: 204 });
		let payload: unknown;
		try {
			payload = JSON.parse(Buffer.from(body).toString('utf8'));
		} catch {
			return new NextResponse(null, { status: 400 });
		}
		const event = parseSentryWebhook(payload, { projectId, org, environment });
		if (event.kind !== 'ready') return new NextResponse(null, { status: event.kind === 'ignored' ? 204 : 400 });
		const result = await deliverSentryWebhookOnce(directory, event.key, () =>
			deliverSentrySlackAlert(event.summary, 'sentry-webhook', { mode: 'webhook', eventUrl: event.eventUrl }),
		);
		return new NextResponse(null, { status: result === 'delivered' || result === 'duplicate' ? 204 : 503 });
	} catch {
		// Never log a webhook body, signature, credential, or SDK event for delivery failures.
		return new NextResponse(null, { status: 503 });
	}
}
