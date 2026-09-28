# 프론트엔드 API 코드 참조

API 구조와 구현 규칙의 단일 출처는 [frontend/AGENTS.md](../../frontend/AGENTS.md)다. 이 문서는 새 API 작업에서 현재 코드의 참조 위치를 빠르게 찾기 위한 보충 자료다.

## 작업 시작 순서

1. `docs/tasks/`에서 endpoint, operation ID 또는 resource 이름과 일치하는 작업 문서를 찾는다.
2. `frontend/AGENTS.md`의 API Architecture와 대상 resource의 기존 구현을 읽는다.
3. Swagger와 기존 코드에서 확인한 요청·응답·오류 계약만 구현한다.
4. raw API, query key, query options 중 변경한 책임에 맞는 테스트를 추가한다.

## 현재 코드 참조

| 책임                           | 위치                                                                    | 확인할 계약                                           |
| ------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| HTTP client와 오류 정규화      | `frontend/src/shared/api/client.ts`                                     | base URL, credential, JSON·DELETE 응답 처리           |
| resource raw API               | `frontend/src/shared/api/<resource>/api.ts`                             | method, URL, request DTO, response DTO                |
| query key                      | `frontend/src/shared/api/<resource>/queries/keys.ts`                    | 결과에 영향을 주는 parameter를 포함한 cache key       |
| query options                  | `frontend/src/shared/api/<resource>/queries/<concern>/query-options.ts` | key, query function, pagination, retry                |
| client query와 server prefetch | 같은 concern의 `use-query.ts`, `prefetch-query.ts`                      | 같은 options factory 재사용                           |
| mutation                       | `frontend/src/shared/api/<resource>/mutations/`                         | resource 공통 cache 갱신과 페이지 전용 후속 동작 분리 |
| DTO 변환                       | 해당 feature의 `lib/map-*.ts`                                           | 소비자가 실제로 필요한 domain model 변환              |

`blogPublicProfileQueryOptions`와 `prefetchBlogPublicProfileQuery`는 query options와 prefetch의 현재 형태를 보여준다. `useCreateCologMutation`은 resource 공통 cache 갱신을 mutation 안에 두는 사례다.

## 구현과 검증 경계

- raw API는 기존 `apiClient`를 사용하고 HTTP contract를 단위 테스트로 보호한다.
- query options는 client hook과 server prefetch가 공유하는 단일 출처다.
- mutation hook은 TanStack Query를 소비하거나 cache·session 같은 공통 부수효과가 있을 때만 만든다.
- DTO를 변환할 필요가 있을 때만 feature의 mapper를 사용한다.
- query·mutation과 RTL의 mock 경계, fixture, assertion 규칙은 [프론트엔드 테스트 기준](../testing/README.md)을 따른다.

이 문서에 새 규칙을 추가하지 않는다. 반복되는 요구가 생기면 `frontend/AGENTS.md`에 규칙을 추가하고, 이 문서에는 현재 코드 참조만 보완한다.
