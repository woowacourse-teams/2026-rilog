import { createServer } from 'node:http';
import { gunzipSync } from 'node:zlib';

interface EnvelopeEvent {
	exception?: unknown;
	contexts?: { runtime?: { name?: string } };
	request?: { url?: string };
}

const failedNodeExceptionUrls: string[] = [];

createServer((request, response) => {
	if (request.method === 'GET' && request.url === '/health') {
		response.writeHead(200).end('ready');
		return;
	}
	if (request.method === 'GET' && request.url === '/state') {
		response.writeHead(200, { 'Content-Type': 'application/json' });
		response.end(JSON.stringify({ failedNodeExceptionUrls }));
		return;
	}
	if (request.method !== 'POST' || !request.url?.startsWith('/api/1/envelope/')) {
		response.writeHead(404).end();
		return;
	}

	const chunks: Buffer[] = [];
	request.on('data', (chunk: Buffer) => chunks.push(chunk));
	request.on('end', () => {
		const data = Buffer.concat(chunks);
		const body = request.headers['content-encoding'] === 'gzip' ? gunzipSync(data) : data;
		for (const line of body.toString().split('\n')) {
			if (!line) continue;
			const event = JSON.parse(line) as EnvelopeEvent;
			if (event.exception && event.contexts?.runtime?.name === 'node' && event.request?.url) {
				failedNodeExceptionUrls.push(event.request.url);
			}
		}
		// HTTP 응답을 보내지 않고 연결을 끊어 SDK의 실제 전송 실패를 유발한다.
		request.socket.destroy();
	});
}).listen(3108, '127.0.0.1');
