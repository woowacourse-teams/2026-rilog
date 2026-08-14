import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Divider from './Divider';

describe('Divider', () => {
	it('구분선 시맨틱과 네이티브 속성을 제공한다', () => {
		render(<Divider aria-label="콘텐츠 구분" />);

		expect(screen.getByRole('separator', { name: '콘텐츠 구분' })).toBeInTheDocument();
	});
});
