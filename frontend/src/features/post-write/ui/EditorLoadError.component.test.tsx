import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import EditorLoadError from './EditorLoadError';

describe('EditorLoadError', () => {
	it('에디터 로드 실패와 복구 방법을 사용자에게 안내한다', () => {
		render(<EditorLoadError />);

		expect(screen.getByRole('alert')).toHaveTextContent('에디터를 불러오지 못했습니다.');
		expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
	});
});
