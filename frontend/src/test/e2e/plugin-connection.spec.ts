import { expect, test } from '@playwright/test';

const STUDIO_ORIGIN = 'https://rilog-import-studio.soonjae8297.chatgpt.site';
const STATE = 'a'.repeat(64);

test('실제 팝업에서 승인한 관리자 계정만 연결하고 갱신 중지 후에는 토큰을 보내지 않는다', async ({
	context,
	page,
	baseURL,
}) => {
	if (!baseURL) throw new Error('브라우저 테스트 baseURL이 필요합니다.');
	const bridgeOrigin = new URL(baseURL).origin;
	const bridgeUrl = `${bridgeOrigin}/plugin-connect?state=${STATE}&environment=develop`;
	let refreshRequests = 0;
	let tokenNow = Date.now();
	const profile = { id: 3, nickname: '팝업 테스트 관리자', slug: 'popup_admin' };
	const jwt = () =>
		`header.${Buffer.from(JSON.stringify({ userId: profile.id, role: 'ADMIN', tokenType: 'ACCESS', exp: Math.floor(tokenNow / 1000) + 60 })).toString('base64url')}.signature`;
	const cors = {
		'Access-Control-Allow-Origin': bridgeOrigin,
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Allow-Headers': 'Authorization, Content-Type',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Expose-Headers': 'Authorization',
	};
	await context.route('**/v1/**', (route) => route.abort('failed'));
	await context.route('https://api.rilog.test/**', (route) =>
		route.fulfill({ status: 401, json: { errorCode: 'REFRESH_TOKEN_MISSING' } }),
	);
	await context.route('https://develop.rilog.kr/v1/**', async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		if (request.method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers: cors });
		} else if (path === '/v1/auth/token/refresh' && request.method() === 'POST') {
			refreshRequests += 1;
			await route.fulfill({ status: 204, headers: { ...cors, Authorization: `Bearer ${jwt()}` } });
		} else if (path === '/v1/users/me' && request.method() === 'GET') {
			await route.fulfill({ status: 200, headers: cors, json: { status: 200, message: 'OK', data: profile } });
		} else {
			await route.abort('failed');
		}
	});
	await context.route(`${STUDIO_ORIGIN}/e2e-plugin-connect`, (route) =>
		route.fulfill({
			contentType: 'text/html; charset=utf-8',
			body: `<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body><button id="open">Rilog 계정 연결</button><button id="refresh">연결 갱신</button><p id="status" role="status">미연결</p><script>
let popup;let accepted=0;
document.getElementById('open').onclick=()=>{popup=window.open(${JSON.stringify(bridgeUrl)},'rilog-popup-test','popup,width=600,height=800');};
window.addEventListener('message',event=>{const data=event.data;if(event.origin!==${JSON.stringify(bridgeOrigin)}||event.source!==popup||data?.state!==${JSON.stringify(STATE)}||data?.environment!=='develop')return;if(data.type==='rilog-import-auth-ready'){document.getElementById('status').dataset.ready='true';return;}if(data.type==='rilog-import-auth'&&data.profile&&typeof data.accessToken==='string'){accepted+=1;document.getElementById('status').textContent=data.profile.nickname+' (@'+data.profile.slug+') 연결됨';document.getElementById('status').dataset.accepted=String(accepted);}});
document.getElementById('refresh').onclick=()=>popup?.postMessage({type:'rilog-import-auth-refresh',state:${JSON.stringify(STATE)},environment:'develop'},${JSON.stringify(bridgeOrigin)});
</script></body></html>`,
		}),
	);
	await page.goto(`${STUDIO_ORIGIN}/e2e-plugin-connect`);
	const popupPromise = context.waitForEvent('page');
	await page.getByRole('button', { name: 'Rilog 계정 연결' }).click();
	const popup = await popupPromise;
	await expect(popup.getByRole('heading', { name: 'Rilog 관리자 계정 연결' })).toBeVisible();
	expect(refreshRequests).toBe(0);
	await expect(page.getByRole('status')).toHaveText('미연결');
	await expect(page.getByRole('status')).toHaveAttribute('data-ready', 'true');
	await popup.clock.install();
	await popup.getByRole('button', { name: '이 계정으로 연결' }).click();
	await expect(page.getByRole('status')).toHaveText('팝업 테스트 관리자 (@popup_admin) 연결됨');
	await expect(page.getByRole('status')).toHaveAttribute('data-accepted', '1');
	await expect(popup.getByRole('status')).toContainText('관리자 인증을 확인했습니다');
	await test.info().attach('connected-popup', { body: await popup.screenshot(), contentType: 'image/png' });
	expect(refreshRequests).toBe(1);
	await expect(popup.locator('body')).not.toContainText('header.');
	await expect(page.locator('body')).not.toContainText('header.');
	tokenNow += 31_000;
	await popup.clock.fastForward(31_000);
	await expect.poll(() => refreshRequests).toBe(2);
	await expect(page.getByRole('status')).toHaveAttribute('data-accepted', '2');
	tokenNow += 31_000;
	await popup.clock.fastForward(31_000);
	await expect.poll(() => refreshRequests).toBe(3);
	await expect(page.getByRole('status')).toHaveAttribute('data-accepted', '3');
	await popup.getByRole('button', { name: '갱신 중지' }).click();
	await expect(popup.getByRole('status')).toContainText('인증 갱신을 중지했습니다');
	await page.getByRole('button', { name: '연결 갱신', exact: true }).click();
	await popup.clock.fastForward(120_000);
	expect(refreshRequests).toBe(3);
	await expect(page.getByRole('status')).toHaveAttribute('data-accepted', '3');
});
