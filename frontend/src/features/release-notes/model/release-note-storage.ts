export const RELEASE_NOTE_STORAGE_KEY = 'rilog.release-notes.dismissed-id';

function isDismissed(storage: 'sessionStorage' | 'localStorage', id: string): boolean {
	try {
		return window[storage].getItem(RELEASE_NOTE_STORAGE_KEY) === id;
	} catch {
		return false;
	}
}

export function shouldShowReleaseNote(id: string): boolean {
	return !isDismissed('sessionStorage', id) && !isDismissed('localStorage', id);
}

export function dismissReleaseNote(id: string, permanently: boolean): void {
	try {
		window[permanently ? 'localStorage' : 'sessionStorage'].setItem(RELEASE_NOTE_STORAGE_KEY, id);
	} catch {
		// 저장소를 사용할 수 없어도 컴포넌트의 상태로 현재 마운트에서는 닫는다.
	}
}

// 다른 탭의 변경이나 실시간 갱신은 구독하지 않는다.
export const subscribeReleaseNote = () => () => {};
export const getServerReleaseNoteVisibility = () => false;
