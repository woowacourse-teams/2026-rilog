import { describe, expect, it } from 'vitest';

import { InvalidApiResponseError, isRecord, parseApiJsonResponse } from './response-validation';

const isId = (value: unknown): value is { id: number } => isRecord(value) && typeof value.id === 'number';

describe('parseApiJsonResponse', () => {
	it('정상 JSON과 필수 데이터 구조를 확인해 반환한다', async () => {
		const body = { status: 200, message: 'OK', data: { id: 7 } };
		await expect(parseApiJsonResponse(Response.json(body), 'test.read', isId)).resolves.toEqual(body);
	});

	it('성공 응답의 데이터 구조가 잘못되면 검증 오류를 반환한다', async () => {
		await expect(
			parseApiJsonResponse(Response.json({ status: 200, message: 'OK', data: { id: '7' } }), 'test.read', isId),
		).rejects.toBeInstanceOf(InvalidApiResponseError);
	});

	it.each(['{broken', ''])(
		'성공 응답 본문 %j이 JSON이 아니면 원문을 노출하지 않고 검증 오류를 반환한다',
		async (body) => {
			await expect(parseApiJsonResponse(new Response(body), 'test.write', isId)).rejects.toMatchObject({
				name: 'InvalidApiResponseError',
				message: 'Invalid API response: test.write',
			});
		},
	);

	it('가드 내부의 프로그래밍 오류는 검증 오류로 바꾸지 않는다', async () => {
		const cause = new SyntaxError('validator bug');
		await expect(
			parseApiJsonResponse(
				Response.json({ status: 200, message: 'OK', data: { id: 7 } }),
				'test.read',
				(_): _ is { id: number } => {
					throw cause;
				},
			),
		).rejects.toBe(cause);
	});
});
