import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useActiveElapsedTime } from './use-active-elapsed-time';

function ActiveElapsedTimeProbe() {
	const getActiveElapsedTime = useActiveElapsedTime();
	const [elapsedTime, setElapsedTime] = useState(0);

	return <button onClick={() => setElapsedTime(getActiveElapsedTime())}>{elapsedTime}</button>;
}

describe('useActiveElapsedTime', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('탭이 숨겨진 구간을 경과 시간에서 제외한다', () => {
		let currentTime = 1_000;
		let visibilityState: DocumentVisibilityState = 'visible';
		vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);

		render(<ActiveElapsedTimeProbe />);

		currentTime = 2_000;
		fireEvent.click(screen.getByRole('button'));
		expect(screen.getByRole('button')).toHaveTextContent('1000');

		visibilityState = 'hidden';
		document.dispatchEvent(new Event('visibilitychange'));
		currentTime = 122_000;
		fireEvent.click(screen.getByRole('button'));
		expect(screen.getByRole('button')).toHaveTextContent('1000');

		visibilityState = 'visible';
		document.dispatchEvent(new Event('visibilitychange'));
		currentTime = 125_000;
		fireEvent.click(screen.getByRole('button'));
		expect(screen.getByRole('button')).toHaveTextContent('4000');
	});
});
