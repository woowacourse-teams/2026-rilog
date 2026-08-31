import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RilogSeries } from '../model/rilog-series';

import { useRilogSeriesDrafts } from './use-rilog-series-drafts';

const SERIES: RilogSeries = { id: 1, name: '웹 개발', postCount: 3 };

describe('useRilogSeriesDrafts', () => {
	it('시리즈 이름 변경을 draft에 보관하고 저장할 때만 목록에 반영한다', () => {
		const { result } = renderHook(() => useRilogSeriesDrafts({ initialSeries: [SERIES] }));

		act(() => {
			result.current.handleStartEditing();
			result.current.handleNameChange(SERIES.id, '프론트엔드');
		});

		expect(result.current.series[0].name).toBe('웹 개발');
		expect(result.current.displayedSeries[0].name).toBe('프론트엔드');

		act(() => result.current.handleSave());

		expect(result.current.series[0].name).toBe('프론트엔드');
	});
});
