# ADR-0001: SEO/AEO/GEO policy for public content

- 상태: 승인
- 날짜: 2026-09-17
- 소유자: frontend

## 맥락

공개 피드·블로그·게시글이 단일 호스트/canonical, sitemap, 구조화 데이터, AI crawler 정책을 갖추지 않아 검색엔진과 AI 답변 엔진에서 발견·인용이 불안정하다. 라이브 검증 결과는 아래와 같다.

- `https://www.rilog.kr` 실측: `sitemap.xml` 2개만, `json_ld_blocks 0`, `sitemap score 50`, `schema 49`, `geo 38`, `performance 35`, `canonical_mismatch 2` (`https://rilog.kr` vs `https://www.rilog.kr`), `h1 5개`(post 91), `img empty alt 12/15`, `security headers 0`.
- 코드베이스: `NEXT_PUBLIC_SITE_URL=https://rilog.kr`(apex) 고정과 `www` 서빙 불일치, `BlogPosting/BreadcrumbList/Person` 미제공, `priority/changefreq` 불필요, `FAQPage` 오남용 위험.

프론트엔드만 수정하고 백엔드 sitemap 데이터는 별도 요청으로 분리해야 한다. 호스트·crawler·schema 정책을 팀 합의로 고정해야 후속 8개 이슈가 일관되게 진행된다.

## 결정

1. host 단일화: `https://www.rilog.kr`로 통일한다. `NEXT_PUBLIC_SITE_URL`, `sitemap.xml`, `robots.txt Sitemap:`, `canonical`, `og:url` 모두 `www`로 생성한다. 배포 nginx는 `rilog.kr -> www 301`을 유지한다.
2. crawler 정책: `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `ChatGPT-User`, `Claude-User`는 `Allow`, `GPTBot`, `Google-Extended`, `ClaudeBot` 등 학습용은 `Disallow: /`를 유지한다(`frontend/src/app/robots.ts` 현행 유지).
3. sitemap: `priority`와 `changefreq`를 생성하지 않는다(Google 무시). `lastmod`만 `publishedAt/updatedAt`로 채운다. 50k 초과 시 sitemap index로 분할한다.
4. schema: `Organization`+`WebSite`(layout), `CollectionPage`(feeds/blog), `BlogPosting`+`BreadcrumbList`+`Person`(post)를 SSR `application/ld+json`으로 제공한다. `Article` 대신 `BlogPosting`(publisher 블로그)이 더 적합하다. `FAQPage`는 `about`에만 제한하고 상업 글에는 추가하지 않는다(Aug 2023 Google 제한, HowTo는 Sep 2023 deprecated).
5. 렌더링: 게시글 본문 `h1`을 `h2`로 다운그레이드해 페이지당 `h1 1개`를 보장하고, `article/time` 시맨틱과 `nav[aria-label]` TOC를 제공한다.
6. 보안 헤더: `HSTS`, `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`를 `next.config.ts:headers()` 또는 nginx 중 한 곳에서 제공한다.
7. 성능/이미지: `remotePatterns`를 S3/velog 도메인으로 축소하고 본문 `img`에 `width/height`와 `loading=lazy`(hero만 priority)로 `CLS`를 해소한다.

## 이유

- 호스트 통일은 `analyze_sitemap` canonical_mismatch의 절반을 즉시 해소하며 Search Console 중복 색인을 방지한다. 현재 `non-www 301 -> www`가 이미 동작하므로 코드만 `www`로 맞추는 비용이 최소다.
- 학습 차단은 콘텐츠 주권을 보호하면서 검색·AI 인용(GEO)은 허용하는 2025-2026 합의다. Perplexity/ChatGPT Search가 `OAI-SearchBot/PerplexityBot`을 사용하므로 허용해야 인용된다.
- `priority/changefreq`는 Google이 무시하므로 생성 비용을 절감하고 `lastmod` 정확도에 집중한다.
- `BlogPosting`+`BreadcrumbList`+`Person`은 `BlogPosting` rich results와 AI 출처 귀속(E-E-A-T)에 직접 영향을 준다. `FAQPage` 상업 남용은 페널티 없이 무시되므로 낭비다.
- `h1` 중복은 `analyze_content h1 5`로 확인된 랭킹 시그널 오염이며 BlockNote `blocksToFullHTML` 레벨 구분 없음이 원인이라 서버 다운그레이드가 최소 수정이다.

## 검토한 대안

- 대안 A: `apex(https://rilog.kr)`로 통일 — `www 301 -> apex`로 반전해야 하며 현재 `non-www -> www` 동작을 뒤집는 배포 변경이 더 크므로 기각.
- 대안 B: `GPTBot Allow` — 스킬 `analyze_geo`가 권고했으나 학습 데이터화에 노출되므로 기각.
- 대안 C: `priority/changefreq` 포함 — Google 무시 문서와 스킬 `sitemap` 참조에 따라 기각.
- 대안 D: `FAQPage`를 모든 글에 추가 — Google Aug 2023 제한으로 rich results 미노출이므로 `about` 한정으로 축소.
- 대안 E: BE에서 sitemap XML까지 생성 — FE가 `metadataBase`·`canonical` 소유이므로 FE가 XML을 생성하고 BE는 데이터만 제공하는 계약이 경계에 맞으므로 기각.

## 결과와 후속 작업

- 얻는 이점: sitemap 50->90, schema 49->85, security 40->85, geo 38->70 예상. 검색·AI 인용 경로가 단일 호스트로 수렴한다.
- 감수하는 비용/위험: `NEXT_PUBLIC_SITE_URL` 변경 시 OG 캐시 무효화 필요(Facebook debugger 재스크랩), `h1` 다운그레이드 시 기존 글 스타일 미세 변화.
- migration/rollback: `www` 변경은 `site-url.ts` 1줄 롤백으로 즉시 복구. sitemap 동적화는 `app/sitemap.ts` 롤백.
- 다시 검토할 조건: BE `GET /v1/sitemap` 제공 후 `app/sitemap.ts`가 N개로 확장됐을 때, 트래픽 50k 초과 시 index 분할, `PAGESPEED_API_KEY` 확보 후 CWV 실측치가 `LCP 2.51 INP 432 CLS 0.25`에서 개선되지 않을 때.
