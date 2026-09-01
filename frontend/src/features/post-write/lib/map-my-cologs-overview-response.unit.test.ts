import { describe, expect, it } from 'vitest';

import { mapMyCologsOverviewResponse } from './map-my-cologs-overview-response';

describe('mapMyCologsOverviewResponse', () => {
	it('overview의 코로그와 챕터를 게시 설정 option으로 변환한다', () => {
		expect(
			mapMyCologsOverviewResponse([
				{
					cologId: 20,
					slug: 'rilog-team',
					name: 'Rilog Team',
					profileImageUrl: 'cologs/rilog-team.png',
					chapters: [
						{ chapterId: 12, name: '제품 개발', order: 0 },
						{ chapterId: 18, name: '회고', order: 1 },
					],
				},
			]),
		).toEqual([
			{
				id: 20,
				slug: 'rilog-team',
				name: 'Rilog Team',
				chapters: [
					{ value: '12', label: '제품 개발' },
					{ value: '18', label: '회고' },
				],
			},
		]);
	});
});
