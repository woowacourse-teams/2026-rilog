/** 원문 설명은 유지하되 알려진 민감 패턴은 치환한다. 임의 사용자 본문은 호출부에서 넣지 않는다. */
export function sanitizeSentryMessage(value?: string): string {
	if (!value) return 'Application error';
	// JS 엔진별 파싱 메시지는 실제 응답/저장 본문 조각을 포함할 수 있다.
	if (/not valid JSON|JSON\.parse|JSON at position|JSON at line|Unexpected end of JSON/i.test(value)) {
		return 'Invalid JSON response';
	}
	return value
		.replace(/https?:\/\/[^\s<>"']+/gi, '[URL]')
		.replace(/(^|\s)(\/(?:[^\s<>"']+))/g, '$1[Path]')
		.replace(/\b(?:body|content|filename|nickname|slug)\s*[:=][^\r\n]*/gi, '[Input filtered]')
		.replace(/\b(?:Authorization|Cookie|Set-Cookie)\s*[:=][^\r\n]*/gi, '[Credentials filtered]')
		.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [Filtered]')
		.replace(
			/\b(?:access[_-]?token|refresh[_-]?token|token|password|secret|signature|code|state)\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)/gi,
			(match) => `${match.split(/[:=]/, 1)[0]}=[Filtered]`,
		)
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Email]')
		.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[Token]')
		.replace(/\p{Cc}/gu, ' ')
		.slice(0, 2048);
}
