import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CologAvatar from './CologAvatar';

describe('CologAvatar', () => {
	it('Co-log 이름을 제공하면 독립적인 이미지로 노출한다', () => {
		render(<CologAvatar fallback="R" label="Rilog Colog" size="sm" />);

		expect(screen.getByRole('img', { name: 'Rilog Colog' })).toHaveTextContent('R');
	});

	it('size prop에 맞는 기본 sizes를 전달한다', () => {
		render(
			<CologAvatar
				src="https://cdn.rilog.test/profiles/raw/colog-123/original.png"
				fallback="R"
				label="Rilog Colog"
				size="aside"
			/>,
		);

		const img = screen.getByRole('img', { name: 'Rilog Colog' }).querySelector('img');
		expect(img?.getAttribute('sizes')).toBe('40px');
	});
});
