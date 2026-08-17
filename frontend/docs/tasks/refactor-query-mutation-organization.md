# Query·Mutation 관심사별 모듈 구조 정리

## 목표

TanStack Query 설정을 client hook과 server prefetch가 공유하도록 query options를 API resource 관심사별 모듈의 단일 출처로 만든다. API DTO를 화면 도메인 모델로 변환하는 mapper는 query 소비 feature의 `select` projection 안에 숨겨 소비자가 직접 호출하지 않게 한다.

## 범위

- `src/api/<resource>/queries/<concern>/` 관심사 디렉터리 안에 query options, client hook, server prefetch 배치
- mutation은 관심사별 mutation 파일에 options와 hook을 colocate
- 전체 피드 조회 query를 `src/api/feeds/queries/full-feed-posts/` 구조로 이전
- 전체 피드의 서버 prefetch와 `HydrationBoundary` hydration 연결
- 팀 블로그 배지 판단을 API DTO mapper 내부에서 처리

## 제외

- 새로운 generic query/mutation builder 도입
- UI 디자인 변경
- API endpoint 또는 response contract 변경
- 기존 mutation 기능 추가

## Acceptance criteria

1. query options 파일에는 `'use client'`와 React import가 없다.
2. client query hook과 server prefetch가 같은 options factory를 사용한다.
3. prefetch helper는 전달받은 `QueryClient`를 사용하고 내부에서 새 client를 만들지 않는다.
4. `/feeds`의 첫 페이지는 서버에서 prefetch되고 client hydration 이후 중복 첫 요청을 만들지 않는다.
5. 무한 스크롤의 다음 페이지는 기존 `page`와 `hasNext` 계약으로 동작한다.
6. API mapper는 `blog.blogId !== user.userId`인 경우에만 팀 블로그 배지 데이터를 만든다.
7. raw API 함수는 `src/api`에 남고, 도메인 mapper는 `features/post-feed`에 둔다.
8. 관련 unit/component/type/build 검증을 실행하고 결과를 완료 보고에 기록한다.
