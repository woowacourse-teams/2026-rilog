import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import RilogDangerZoneSection from './RilogDangerZoneSection';

describe('RilogDangerZoneSection', () => {
	it('관리자 문의를 통한 계정 탈퇴 방법과 삭제 영향을 안내한다', () => {
		render(<RilogDangerZoneSection />);

		expect(screen.getByRole('heading', { level: 2, name: '계정 탈퇴' })).toBeInTheDocument();
		expect(screen.getByText(/하단의 소셜을 통해 관리자에게 문의/)).toBeInTheDocument();
		expect(screen.getByText(/개인 설정과 작성한 기록을 복구할 수 없습니다/)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '계정 탈퇴' })).not.toBeInTheDocument();
	});
});
