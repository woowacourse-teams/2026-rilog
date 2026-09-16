const requestProxySessionUpdate = async (method: 'POST' | 'DELETE') => {
	const response = await fetch('/api/auth/proxy-session', {
		credentials: 'same-origin',
		method,
	});

	if (!response.ok) {
		throw new Error(`Proxy session update failed: ${response.status}`);
	}
};

let pendingSessionUpdate: Promise<void> = Promise.resolve();

// 쿠키는 응답 시 브라우저에 반영되므로 요청 자체를 직렬화한다.
const enqueueProxySessionUpdate = (method: 'POST' | 'DELETE') => {
	const update = pendingSessionUpdate.then(() => requestProxySessionUpdate(method));
	pendingSessionUpdate = update.catch(() => undefined);
	return update;
};

export const registerProxySession = () => enqueueProxySessionUpdate('POST');

export const clearProxySession = () => enqueueProxySessionUpdate('DELETE');
