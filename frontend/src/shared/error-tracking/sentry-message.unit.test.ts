import { describe, expect, it } from 'vitest';

import { sanitizeSentryError } from './sentry-privacy';
import { createApiErrorReport, sanitizeApiErrorEvent } from './sentry-api-error';
import { normalizeApiError } from '@/shared/api/api-error';

const context = { environment: 'prod', release: 'test' };
const report = (value: string) =>
	sanitizeSentryError({ type: undefined, exception: { values: [{ type: 'Error', value }] } }, context).exception
		?.values?.[0].value;

describe('Sentry 오류 설명 보존', () => {
	it('API 경계에서 정규화된 응답 검증 오류의 설명도 남긴다', () => {
		const report = createApiErrorReport(normalizeApiError(new Error('Invalid API response: uploads.presign')), 'query');
		const sent = sanitizeSentryError(sanitizeApiErrorEvent({ type: undefined }, report), context);
		expect(sent.exception?.values?.[0].value).toContain('Invalid API response: uploads.presign');
	});
	it.each([
		'발행 응답에 게시글 정보가 없습니다.',
		'Minified React error #418',
		"Cannot read properties of undefined (reading 'map')",
	])('%s의 진단 문구를 유지한다', (message) => {
		expect(report(message)).toBe(message);
	});
	it('서명 URL, 이메일, 인증정보를 제거해도 실패 설명은 남긴다', () => {
		const message =
			'Upload failed: https://storage.test/private-file?X-Amz-Signature=secret person@example.com Authorization: Bearer private-token';
		const sent = report(message);
		expect(sent).toContain('Upload failed:');
		for (const value of ['private-file', 'secret', 'person@example.com', 'private-token'])
			expect(sent).not.toContain(value);
	});
	it('JSON 파싱 오류의 입력 조각은 생략한다', () => {
		expect(report('Unexpected token x, "private body" is not valid JSON')).toBe('Invalid JSON response');
	});
	it('로그 메시지도 같은 치환을 거친다', () => {
		const sent = sanitizeSentryError({ type: undefined, message: 'Login failed: token=private-token' }, context);
		expect(sent.message).toBe('Login failed: token=[Filtered]');
	});
	it('네트워크 오류 제목에서 실패 유형을 확인할 수 있다', () => {
		const sent = sanitizeSentryError(
			{
				type: undefined,
				exception: { values: [{ type: 'NormalizedApiError' }] },
				tags: { operation: 'query', error_type: 'network' },
			},
			context,
		);
		expect(sent.exception?.values?.[0].value).toContain('NO_RESPONSE; network');
	});
});
