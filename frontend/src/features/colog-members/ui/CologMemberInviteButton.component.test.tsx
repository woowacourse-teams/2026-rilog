import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CologMemberInviteButton from './CologMemberInviteButton';

describe('CologMemberInviteButton', () => {
	it('멤버 관리 페이지로 이동하는 링크를 표시한다', () => {
		render(<CologMemberInviteButton slug="rilog-team" />);

		expect(screen.getByRole('link', { name: '멤버 추가' })).toHaveAttribute(
			'href',
			'/@rilog-team/settings?tab=members',
		);
	});
});
