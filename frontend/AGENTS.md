# Rilog 프론트엔드 작업 규칙

루트 `AGENTS.md`와 `docs/harness/team-defaults.md`를 함께 따른다. 아래 규칙은 frontend 스캐폴드 이후 적용한다.

## 기술 기준

- Next.js App Router와 TypeScript strict를 사용한다.
- Server Component가 기본이다. 이벤트, 브라우저 API, 로컬 상태 또는 Client hook이 필요한 가장 작은 leaf 경계에만
  `'use client'`를 둔다.
- Tailwind semantic token과 공통 UI를 우선 사용한다.
- ky는 HTTP 전송과 오류 정규화, TanStack Query는 Client Component의 원격 상태 cache와 mutation을 담당한다.
- 별도 전역 상태 라이브러리는 초기 도입하지 않는다. 로컬 state, URL, TanStack Query로 해결되지 않는 반복 사례가 생기면 ADR로 검토한다.

## 구조

- `api`: API 모듈
- `app`: route, layout, metadata와 페이지 조립
- `widgets`: 여러 feature/domain을 조합한 큰 UI
- `features`: 사용자 행동과 유스케이스
- `domains`: post, colog 같은 핵심 도메인 model/API/UI
- `shared`: 특정 도메인에 종속되지 않는 기반
- `test`: 공통 fixture, factory와 setup

`app`에 비즈니스 규칙을 직접 구현하지 않는다. 두 군데에서 사용됐다는 이유만으로 `shared`로 올리지 않으며 도메인 독립성이 확인될 때 승격한다.

## 명명과 export

- 폴더와 일반 TypeScript 파일: kebab-case
- React 컴포넌트 파일과 타입: PascalCase. `page.tsx`, `layout.tsx` 같은 Next.js 예약 파일은 예외로 한다.
- hook: `use` + PascalCase
- 함수와 변수: camelCase
- boolean 변수는 의미에 맞게 `is`, `has`, `can`, `should`, `did`, `will` 접두사 사용을 권장하되 린트로 강제하지 않는다.
- 상수: SCREAMING_SNAKE_CASE
- 컴포넌트: `default export`와 `function` 선언
- 컴포넌트 외 함수·타입·상수: `named export`
- 단위 테스트: `*.unit.test.ts`
- 컴포넌트 테스트: `*.component.test.tsx`
- E2E: `*.spec.ts`

### TypeScript 타입 선언

- 이름을 가진 객체 계약은 `interface`를 기본으로 한다.
- union, tuple, 함수 타입, primitive alias, mapped/conditional type처럼 `interface`로 표현할 수 없거나
  `type`이 더 명확한 경우에는 `type`을 사용한다.
- 위 허용 범주에는 별도 근거를 요구하지 않는다. 객체 계약을 예외적으로 type alias로 선언할 때만 이슈 또는 PR에 근거를 기록한다.

### 내부 import 경로

- 같은 모듈 내부에서는 상대 경로를 허용한다. 상대 경로 사용은 의무가 아니며 `@/*` 절대 경로도 사용할 수 있다.
- 모듈 경계를 넘는 내부 참조는 `@/*` 절대 경로를 사용한다.
- 모듈 경계는 `app`의 route segment 또는 공통 조립 영역, `features/<slice>`, `domains/<domain>`,
  `widgets/<widget>`, `shared/<module>`, `shared/ui/<component>`, `test`로 본다.
- 외부 package import와 CSS 파일 내부의 `@import`에는 이 규칙을 적용하지 않는다.
- VS Code workspace는 자동 import에서 non-relative 경로를 우선하도록 설정하지만, 에디터 동작이 아니라 코드의 모듈 경계를 기준으로 리뷰한다.

### 배럴 export

- 프로젝트 내부 모듈에는 재수출을 위한 `index.ts` 배럴을 만들지 않고 실제 파일 경로에서 직접 import한다.
- `export *`와 `@/shared`, `@/features` 같은 root mega-barrel을 사용하지 않는다.
- 외부 package 분리, 반복적인 내부 파일 이동, 명시적인 public API 관리 필요가 생기면 별도 이슈 또는 ADR에서 배럴 도입을 다시 검토한다.

## API Architecture

- API 구현 작업을 시작할 때 먼저
  `docs/tasks/`를 검색한다. 요청 endpoint, operation ID 또는 resource 이름과 일치하는 task 문서가 있으면 해당 문서를 읽고 acceptance criteria와 scope를 따른다.
- API task 문서가 여러 개 일치하면 가장 구체적인 문서를 우선하고, 적용한 문서 경로를 작업 계획과 완료 보고에 명시한다. 일치하는 문서가 없으면 아래 API Architecture 규칙과 기존 코드 convention을 기준으로 진행한다.
- API 모듈은 `src/api` 아래에 둔다.
- 백엔드 endpoint의 `/v1` 다음 첫 번째 path segment를 기준으로 모듈을 그룹화한다.
    - `/v1/blogs/...`는 `src/api/blogs`에 둔다.
    - `/v1/feeds/...`는 `src/api/feeds`에 둔다.
- API 모듈도 위의 배럴 export 금지 규칙을 따른다. `index.ts`를 만들지 않고 필요한 파일 경로에서 직접 import한다.
- React와 TanStack Query에 의존하지 않는 raw HTTP 함수는 `{resource}.apis.ts`에 둔다.
    - 기존 HTTP client, base URL 처리, response wrapper, 인증과 오류 처리 방식을 재사용한다.
- API 함수, query/mutation hook 또는 consumer가 공유하는 타입은 `{resource}.types.ts`에 둔다.
- query key factory는 `{resource}.keys.ts`에 둔다. 반환 데이터에 영향을 주는 모든 parameter를 query key에 포함한다.
- TanStack Query resource query는 `src/api/<resource>/queries/<concern>/` 관심사별 디렉터리 안에 options, client hook, server prefetch를 함께 둔다.
    - `<concern>-query-options.ts`: `'use client'` 없이 query key, query function, pagination과 같은 단일 query 설정을 제공한다.
    - `use-<concern>-query.ts`: `'use client'` 경계에서 위 options를 `useQuery` 또는 `useInfiniteQuery`에 전달한다.
    - `prefetch-<concern>-query.ts`: `'use client'` 없이 같은 options를 `QueryClient.prefetchQuery` 또는 `prefetchInfiniteQuery`에 전달한다. QueryClient를 내부에서 생성하지 않는다.
- query options factory는 client hook과 server prefetch가 공유하는 단일 출처다. options 파일에는 React import나 `'use client'`를 넣지 않는다.
- query가 API DTO를 도메인 모델로 변환해야 하면 `features`의 얇은 consumer hook이 API query hook의 `select`를 주입한다. mapper와 projection은 `features`에 두되 query key, query function, pagination, prefetch의 소유권은 `src/api` query에 둔다.
- mutation은 관심사별 `mutations/` 파일에 둔다. mutation options가 한 hook에서만 사용되면 `use-<concern>-mutation.ts`에 colocate하고, 여러 소비자나 순수 테스트에서 재사용할 때만 별도 `*-mutation-options.ts`로 분리한다. mutation에는 query와 같은 SSR prefetch 파일을 만들지 않는다.
- resource 전반에 공통으로 적용되는 cache invalidate/update는 mutation hook 안에 둔다.
- 페이지 또는 feature 전용 후속 동작은 `mutate`/`mutateAsync` 호출 시 `onSuccess` 또는
  `onError` callback으로 전달하고 shared mutation hook에 포함하지 않는다.
- 모든 raw API 함수에 query 또는 mutation hook을 기계적으로 만들지 않는다. TanStack Query로 소비하거나 구체적인 사용 사례가 있을 때만 추가한다.
- 목록 API라는 이유만으로 hook 종류를 정하지 않는다. 실제 pagination contract와 소비 방식에 따라 `useQuery` 또는
  `useInfiniteQuery`를 선택한다.
- 기존 저장소의 HTTP client, TypeScript, import, 오류 처리, 테스트 convention이 더 구체적이면 해당 convention을 따른다.
- 단일 endpoint를 위해 generic API repository, generic query-hook builder 같은 과도한 추상화를 도입하지 않는다. 반복되는 요구가 확인되기 전에는 resource에 한정된 작은 함수와 타입을 우선한다.
- Swagger와 기존 코드에서 확인되지 않은 parameter, response field, nullability, enum, pagination 또는 인증 동작을 추측하지 않는다.

## 테스트

- Vitest: policy, mapper, serializer, query key와 순수 함수
- React Testing Library: 입력, 상태 전이, 오류, focus와 accessible name
- Playwright: 로그인, 글 저장·발행, Co-log 생성·초대와 공개 탐색 같은 수직 흐름
- RTL에서는 accessible role/name과 label을 우선하고 `data-testid`는 마지막 수단으로 사용한다.
- className, 내부 state, private method와 대형 DOM snapshot을 테스트하지 않는다.

## 필수 검증

- 스캐폴드 전에는 실행 가능한 frontend 검증 명령이 없다.
- PR 전 `pnpm check`를 실행한다.
- 핵심 사용자 흐름을 변경하면 관련 `pnpm test:e2e` smoke를 실행한다.
- UI 변경은 loading, empty, error, 권한 없는 상태와 키보드/focus를 확인한다.
- 실제 `package.json`의 script 이름이 다르면 문서와 CI를 함께 일치시킨다.

## Code Review Rules

- route/page 전체를 편의상 Client Component로 바꾼 변경을 지적한다.
- Server-only code가 client bundle로 새는 import를 지적한다.
- ky와 TanStack Query의 책임이 UI 컴포넌트 안에서 혼합된 변경을 지적한다.
- 사용자 동작 대신 구현 세부만 검증하는 테스트를 지적한다.
- 임의 색상값, 접근 가능한 이름이 없는 control, keyboard path가 없는 상호작용을 지적한다.
- 근거 없이 이름을 가진 객체 계약을 type alias로 선언한 변경을 지적한다.
- 모듈 경계를 넘으면서 상대 경로를 사용한 import를 지적한다.
- 재수출을 위한 `index.ts` 또는 `export *`를 추가한 변경을 지적한다.
