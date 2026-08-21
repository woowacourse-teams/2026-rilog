import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentType, ReactNode } from 'react';

const dynamicOptions = vi.hoisted(() => ({ ssr: true }));

vi.mock('next/dynamic', () => ({
	default: (_loader: () => Promise<unknown>, options: { loading: () => ReactNode; ssr: boolean }): ComponentType => {
		function LoadingEditor() {
			return options.loading();
		}

		dynamicOptions.ssr = options.ssr;
		return LoadingEditor;
	},
}));

import DynamicBlockNoteEditor from './DynamicBlockNoteEditor';

describe('DynamicBlockNoteEditor', () => {
	it('client editor를 불러오는 동안 작성 영역과 접근 가능한 상태를 유지한다', () => {
		render(
			<DynamicBlockNoteEditor
				onChange={vi.fn()}
				onReady={vi.fn()}
				uploadFile={vi.fn(() => Promise.resolve('data:image/png;base64,mock'))}
			/>,
		);

		expect(screen.getByRole('status', { name: '에디터 불러오는 중' })).toBeInTheDocument();
		expect(dynamicOptions.ssr).toBe(false);
	});
});
