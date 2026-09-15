import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CologSettingsPage from './page';

const { notFoundMock, permanentRedirectMock } = vi.hoisted(() => ({
	notFoundMock: vi.fn((): never => {
		throw new Error('NEXT_NOT_FOUND');
	}),
	permanentRedirectMock: vi.fn((): never => {
		throw new Error('NEXT_REDIRECT');
	}),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock, permanentRedirect: permanentRedirectMock }));
vi.mock('@/widgets/settings/ui/SettingsWorkspaceRouter', () => ({
	default: function MockSettingsWorkspaceRouter() {
		return <div>설정 화면</div>;
	},
}));

describe('CologSettingsPage', () => {
	beforeEach(() => {
		notFoundMock.mockClear();
		permanentRedirectMock.mockClear();
	});

	it('canonical 설정 경로는 redirect하지 않는다', async () => {
		const page = await CologSettingsPage({
			params: Promise.resolve({ slug: '@rilog_fe' }),
			searchParams: Promise.resolve({ tab: 'members' }),
		});

		render(page);
		expect(screen.getByText('설정 화면')).toBeInTheDocument();
		expect(permanentRedirectMock).not.toHaveBeenCalled();
	});

	it('하이픈이 포함된 기존 설정 경로는 query를 보존한 canonical 경로로 redirect한다', async () => {
		await expect(
			CologSettingsPage({
				params: Promise.resolve({ slug: '@rilog-fe' }),
				searchParams: Promise.resolve({ tab: 'members', invite: 'true' }),
			}),
		).rejects.toThrow('NEXT_REDIRECT');

		expect(permanentRedirectMock).toHaveBeenCalledWith('/@rilog_fe/settings?tab=members&invite=true');
	});
});
