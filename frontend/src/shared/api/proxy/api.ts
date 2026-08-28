const requestProxySessionUpdate = async (method: 'POST' | 'DELETE') => {
	const response = await fetch('/api/auth/proxy-session', {
		credentials: 'same-origin',
		method,
	});

	if (!response.ok) {
		throw new Error(`Proxy session update failed: ${response.status}`);
	}
};

export const registerProxySession = () => requestProxySessionUpdate('POST');

export const clearProxySession = () => requestProxySessionUpdate('DELETE');
