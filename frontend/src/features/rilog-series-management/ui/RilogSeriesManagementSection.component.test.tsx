import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RilogSeries } from '../model/rilog-series';

import RilogSeriesManagementSection from './RilogSeriesManagementSection';

const SERIES: RilogSeries[] = [
	{ id: 1, name: '웹 개발', postCount: 3 },
	{ id: 2, name: '기록', postCount: 7 },
];

describe('RilogSeriesManagementSection', () => {
	it('시리즈 목록과 삭제 작업을 렌더링한다', () => {
		render(<RilogSeriesManagementSection series={SERIES} onDeleteSeries={vi.fn()} />);

		expect(screen.getByRole('table', { name: '시리즈 목록' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '시리즈' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '웹 개발 시리즈 삭제' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '기록 시리즈 삭제' })).toBeInTheDocument();
	});

	it('전달받은 상태에 따라 시리즈 추가 모달을 렌더링한다', () => {
		render(
			<RilogSeriesManagementSection
				series={SERIES}
				isCreateModalOpen
				onCloseCreateModal={vi.fn()}
				onCreateSeries={vi.fn()}
			/>,
		);

		expect(screen.getByRole('dialog', { name: '시리즈 추가' })).toBeInTheDocument();
	});
});
