# 전체 피드 게시물 목록 조회 API 구현

UI를 변경하지 않고 전체 피드 게시물 목록 조회 API를 연동한다.

Swagger operation:

<https://develop.rilog.kr/swagger-ui/index.html#/피드%20목록%20조회%20API/readFullFeedPosts>

## 구현 전 확인

1. Swagger의 `readFullFeedPosts` operation을 직접 열어 다음 계약을 구현 시점에 다시 확인한다.
   - HTTP method와 endpoint path
   - path, query, header, body parameter와 required 여부
   - request와 response 타입
   - pagination 방식과 page index 기준
   - operation 또는 전역 설정에서 상속되는 인증 요구사항
   - response wrapper
   - nullable/optional field와 enum
2. 저장소의 기존 API 코드를 확인하고 다음 convention을 따른다.
   - HTTP client와 base URL 처리
   - 인증 및 request interceptor
   - API response wrapper
   - 오류 정규화와 전파
   - TanStack Query 버전과 사용 방식
   - query key와 option factory
   - TypeScript 타입, 파일명, import와 path alias
   - 테스트와 검증 명령
3. Swagger와 코드가 다르면 임의로 결정하지 않는다. 기존 client 동작을 존중하고 불일치를 완료 보고에 명시한다.

문서화되지 않은 API 세부 사항을 추측하지 않는다.

## 확인된 Swagger 스냅샷

아래 내용은 2026-08-17 OpenAPI 문서를 기준으로 확인했다. 서버 계약은 바뀔 수 있으므로 구현 직전에 다시 검증한다.

- operation ID: `readFullFeedPosts`
- method/path: `GET /v1/feeds/posts`
- request body: 없음
- 필수 query parameter:
  - `page`: `integer` (`int32`)
  - `size`: `integer` (`int32`)
- 성공 response: `200`
- response schema: `ApiResponseFullFeedPostResponse`
  - `status`: `integer` (`int32`)
  - `message`: `string`
  - `data`: `FullFeedPostResponse`
- `data`의 pagination field:
  - `posts`: `PostItemResponse[]`
  - `page`: `integer` (`int32`)
  - `size`: `integer` (`int32`)
  - `numberOfElements`: `integer` (`int32`)
  - `hasNext`: `boolean`
- `PostItemResponse`의 현재 field:
  - `postId`: `integer` (`int64`)
  - `title`: `string`
  - `thumbnailUrl`: `string`
  - `category`: `string`
  - `visibility`: `string`
  - `publishedAt`: `string` (`date-time`)
  - `user`: `AuthorResponse`
  - `blog`: `BlogResponse`
- OpenAPI 문서는 전역 `accessToken` Bearer JWT security requirement를 정의하며 이 operation은 이를 override하지 않는다. endpoint별 인증 코드를 추가하기 전에 기존 HTTP client가 인증을 처리하는 방식을 확인한다.
- 현재 schema는 field를 required 또는 nullable로 표시하지 않는다. 근거 없이 단정하지 말고 저장소의 기존 OpenAPI/type convention에 맞춘다.

## 구조와 책임

`/v1` 다음 첫 path segment가 `feeds`이므로 다음 위치에 구현한다.

```text
src/api/
├── shared.types.ts
└── feeds/
    ├── api.ts
    ├── types.ts
    └── queries/
        ├── keys.ts
        └── full-feed-posts/
            ├── query-options.ts
            ├── use-query.ts
            └── prefetch.ts
```

저장소에 더 구체적이고 일관된 명명 convention이 이미 있다면 개별 파일명은 그 convention에 맞춘다. 기존 `feeds` 파일이 있으면 중복 생성하지 말고 재사용한다.

- `index.ts`나 다른 barrel export를 추가하지 않는다.
- framework-independent raw HTTP 함수는 `api.ts`에 둔다.
- 이 operation에 필요한 resource request/response 타입은 `types.ts`에 둔다. 기존 generic API response wrapper는 `src/api/shared.types.ts`에서 재사용한다.
- 안정적인 query-key factory는 `queries/keys.ts`에 둔다.
- query option factory, client hook, server prefetch는 `queries/full-feed-posts/` 안의 `query-options.ts`, `use-query.ts`, `prefetch.ts`에 둔다.
- React와 TanStack Query import를 `api.ts`에 넣지 않는다.
- 기존 HTTP client의 인증, base URL, query serialization, error와 response unwrapping 동작을 재사용한다.
- 이 endpoint 하나를 위해 generic API repository나 generic query-hook builder를 도입하지 않는다.

## Pagination 결정

API 계약과 실제 소비 방식을 모두 확인한 뒤 `useQuery` 또는 `useInfiniteQuery`를 선택한다.

- load-more 또는 infinite scroll로 소비한다면 `useInfiniteQuery`를 우선한다. response의 `page`와 `hasNext`로 다음 page를 계산하고 `hasNext`가 false면 다음 page를 반환하지 않는다. `size`와 page 외 모든 입력을 query key에 포함한다.
- consumer가 명시적인 page 값을 소유하고 결과를 페이지 단위로 교체한다면 `useQuery`를 우선한다. `page`와 `size`를 모두 query key에 포함한다.
- hook consumer를 만들기 위해 page, component, route 또는 다른 UI 코드를 수정하지 않는다.

## 작업 범위

포함:

- raw HTTP API 함수
- 정확한 request/response 타입
- query-key factory
- query option factory
- 저장소 dependency와 구체적인 feed query 사용 패턴에 맞는 TanStack Query hook
- 유사한 API/query module 테스트가 이미 있다면 해당 convention을 따르는 집중된 테스트

제외:

- UI, page, component, route와 styling 변경
- 관련 없는 API refactor
- barrel export
- 읽기 전용 endpoint를 위한 mutation hook
- 추측에 기반한 공유 abstraction

## 검증과 완료 보고

- 저장소에서 실행 가능한 가장 좁은 범위의 type-check, lint와 test를 실행한다.
- barrel export와 UI 파일이 추가 또는 변경되지 않았는지 확인한다.
- 완료 보고에 다음을 포함한다.
  - 생성 또는 변경한 파일
  - 검증한 method, path, parameter, response, pagination과 인증 동작
  - `useQuery` 또는 `useInfiniteQuery`를 선택한 이유
  - 실행한 검증 명령과 결과
- Swagger와 코드의 불일치 또는 해결되지 않은 모호성

## 후속 query 구조 결정

피드 응답을 화면 도메인 모델로 변환하는 mapper와 SSR hydration을 함께 다루기 위해 query options, client hook, server prefetch는 `src/api/feeds/queries/full-feed-posts/`에 관심사별로 colocate한다. feature는 API query hook에 `select` projection을 주입하고 mapper를 직접 소비자에게 노출하지 않는다. 세부 acceptance criteria는 [`refactor-query-mutation-organization.md`](./refactor-query-mutation-organization.md)를 따른다.
