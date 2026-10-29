import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { deliverSentryWebhookOnce } from './sentry-webhook-delivery-state';

const key = '1-0123456789abcdef0123456789abcdef';
let directory: string;
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), 'rilog-sentry-state-test-'));
});
afterEach(async () => {
	await rm(directory, { recursive: true, force: true });
});

it('모듈을 다시 읽어도 완료한 event의 전송은 반복하지 않는다', async () => {
	const deliver = vi.fn().mockResolvedValue(true);
	expect(await deliverSentryWebhookOnce(directory, key, deliver)).toBe('delivered');
	vi.resetModules();
	const reloaded = await import('./sentry-webhook-delivery-state');
	expect(await reloaded.deliverSentryWebhookOnce(directory, key, deliver)).toBe('duplicate');
	expect(deliver).toHaveBeenCalledOnce();
	expect(await readdir(directory)).toEqual([`${key}.delivered`]);
});

it('동시에 들어온 event는 하나만 전달하고 실행 중인 요청은 retry를 요구한다', async () => {
	let finish: ((value: boolean) => void) | undefined;
	const deliver = vi.fn(
		() =>
			new Promise<boolean>((resolve) => {
				finish = resolve;
			}),
	);
	const first = deliverSentryWebhookOnce(directory, key, deliver);
	await vi.waitFor(() => expect(deliver).toHaveBeenCalledOnce());
	expect(await deliverSentryWebhookOnce(directory, key, deliver)).toBe('busy');
	finish?.(true);
	expect(await first).toBe('delivered');
});

it('실패 뒤에는 claim을 해제하고 재시도하며 서로 다른 event는 모두 전달한다', async () => {
	const deliver = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
	expect(await deliverSentryWebhookOnce(directory, key, deliver)).toBe('failed');
	expect(await deliverSentryWebhookOnce(directory, key, deliver)).toBe('delivered');
	expect(await deliverSentryWebhookOnce(directory, '1-11111111111111111111111111111111', deliver)).toBe('delivered');
	expect(deliver).toHaveBeenCalledTimes(3);
});

it('상대 경로나 event key의 경로 주입은 전달 전에 거부한다', async () => {
	const deliver = vi.fn();
	await expect(deliverSentryWebhookOnce('relative', key, deliver)).rejects.toThrow();
	await expect(deliverSentryWebhookOnce(directory, '../invalid', deliver)).rejects.toThrow();
	expect(deliver).not.toHaveBeenCalled();
});
