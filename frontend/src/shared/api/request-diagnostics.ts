/** Keep the request that caused an error without maintaining an endpoint registry. */
export interface ApiRequestDiagnostics {
	method: string;
	url: string;
}

const requests = new WeakMap<object, ApiRequestDiagnostics>();

export function rememberApiRequest(error: unknown, method: string, url: string, baseUrl?: string): void {
	if (typeof error !== 'object' || error === null) return;
	try {
		requests.set(error, { method: method.toUpperCase(), url: new URL(url, baseUrl).toString() });
	} catch {
		// An invalid URL must not change the API error.
	}
}

export function rememberApiResponse(response: Response, method: string, url: string, baseUrl?: string): boolean {
	rememberApiRequest(response, method, url, baseUrl);
	return requests.has(response);
}

export function copyApiRequestDiagnostics(response: Response, error: unknown): void {
	if (typeof error !== 'object' || error === null) return;
	const request = requests.get(response);
	if (request) requests.set(error, request);
}

export function getApiRequestDiagnostics(error: unknown): ApiRequestDiagnostics | undefined {
	return typeof error === 'object' && error !== null ? requests.get(error) : undefined;
}
