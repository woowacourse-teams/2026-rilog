import { describe, expect, it } from 'vitest';

import { getAboutPageAcquisitionSource } from './about-page-acquisition';

describe('About 페이지 획득 경로', () => {
	it('사전 신청 이메일 UTM을 이메일 유입으로 분류한다', () => {
		expect(
			getAboutPageAcquisitionSource(
				'?utm_source=pre_registration&utm_medium=email&utm_campaign=about_launch',
			),
		).toBe('pre_registration_email');
	});

	it.each([
		'',
		'?utm_source=pre_registration',
		'?utm_source=pre_registration&utm_medium=social',
		'?utm_source=other&utm_medium=email',
	])('%s는 출처 미지정으로 분류한다', (search) => {
		expect(getAboutPageAcquisitionSource(search)).toBe('unattributed');
	});
});
