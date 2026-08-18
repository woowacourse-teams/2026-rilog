import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CologAvatar from './CologAvatar';

describe('CologAvatar', () => {
	it('Co-log 이름을 제공하면 독립적인 이미지로 노출한다', () => {
		render(<CologAvatar fallback="R" label="Rilog Co-log" size="max" />);

		expect(screen.getByRole('img', { name: 'Rilog Co-log' })).toHaveTextContent('R');
	});
});
