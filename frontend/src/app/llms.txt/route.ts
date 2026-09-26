import { SITE_DESCRIPTION, SITE_NAME } from '@/shared/seo/create-social-metadata';
import { siteUrl, toAbsoluteSiteUrl } from '@/shared/seo/site-url';

export const revalidate = 3600;

export const GET = () => {
	const lines = [
		`# ${SITE_NAME}`,
		`> ${SITE_DESCRIPTION}`,
		'',
		'Rilog는 깊이 있는 기록과 지식 공유를 위한 블로그 플랫폼입니다. 공개 글은 검색엔진과 AI 검색의 출처로 인용될 수 있습니다.',
		'',
		'## 크롤 정책',
		'- 검색·AI 인용 크롤러: OAI-SearchBot, Claude-SearchBot, PerplexityBot, ChatGPT-User, Claude-User 는 허용 (Allow: /)',
		'- 학습용 크롤러: GPTBot, Google-Extended, ClaudeBot 은 차단 (Disallow: /) - 상세는 /robots.txt 참조',
		'- 비공개 경로는 /robots.txt에서 Disallow: /api/, /auth/, /write, /sign-up, /colog/create, /*/settings',
		'',
		'## 콘텐츠 범위',
		'- 개인 블로그 Rilog와 팀 블로그 Colog의 공개 게시글을 제공합니다.',
		'- Rilog: 개인이 자신의 생각과 경험을 기록하는 개인 블로그',
		'- Colog: 프로젝트·스터디·팀이 함께 기록하고 지식을 축적하는 팀 블로그',
		'- 공개 게시글만 검색·인용 대상이며 비공개 글과 임시저장 글은 대상이 아닙니다.',
		'- 게시글 카테고리는 기술, 일상, 회고로 구분됩니다.',
		'',
		'## URL 구조',
		'- 개인·팀 블로그: /@<slug>',
		'- 게시글: /@<slug>/posts/<postId>',
		'- 게시글 Markdown 표현: /@<slug>/posts/<postId>/markdown',
		'',
		'## 주요 경로',
		`- [피드](${toAbsoluteSiteUrl('/feeds')}): 전체 공개 글 목록`,
		`- [소개](${toAbsoluteSiteUrl('/about')}): 서비스 소개`,
		`- [Sitemap](${toAbsoluteSiteUrl('/sitemap.xml')}): 전체 URL 목록`,
		`- [RSS](${toAbsoluteSiteUrl('/rss.xml')}): 최신 공개 글 50개 RSS 2.0`,
		`- [JSON Feed](${toAbsoluteSiteUrl('/feed.json')}): JSON Feed 1.1`,
		'',
		'## 인용 기준',
		'- 공개 게시글을 인용할 때는 원문 canonical URL을 출처로 사용해주세요.',
		'- 제목, 작성자, 게시일을 출처 정보로 함께 표시해주세요.',
		'- Markdown 표현 URL은 콘텐츠 접근용이며 검색 결과의 canonical URL로 사용하지 마세요.',
		'',
		'## 피드 형식',
		'- RSS: /rss.xml (RSS 2.0, 최신 공개 글 50개)',
		'- JSON Feed: /feed.json (JSON Feed 1.1)',
		'- Markdown 대체 뷰: /@<slug>/posts/<id>/markdown (게시글의 Markdown 표현, X-Robots-Tag: noindex)',
		'',
		'## 연락',
		`- Email: rilog.admin@gmail.com`,
		`- Instagram: https://www.instagram.com/rilog_official/`,
		'',
		'## 참고',
		`- canonical 호스트: ${siteUrl.origin}`,
		`- 언어: ko-KR`,
	];

	return new Response(lines.join('\n'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
		},
	});
};
