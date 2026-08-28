# Rilog Frontend API 계층 구현 가이드

`frontend/src/shared/api` 디렉터리는 애플리케이션 전반에서 사용하는 네트워크 요청(HTTP 통신) 및 서버 상태 관리(TanStack Query)를 캡슐화하는 계층입니다. 이 가이드는 팀 내에서 API를 연동할 때 일관성을 유지할 수 있도록 구조와 규칙을 안내합니다.

## 1. 폴더 구조 개요

API 계층은 크게 **코어 클라이언트 모듈**과 **도메인별 모듈**로 나뉩니다.

```text
shared/api/
├── client.ts                 # 전역 ky 인스턴스 내보내기
├── create-ky-instance.ts     # ky 클라이언트 팩토리 (인터셉터, 에러 처리 로직 포함)
├── api-error.ts              # API 에러 클래스 및 정규화 유틸리티
├── error-codes.ts            # 백엔드 커스텀 에러 코드 정의
├── shared.types.ts           # 공통 응답 타입 (예: ApiResponse<T>)
│
├── blogs/                    # 도메인 (Bounded Context 또는 REST 리소스)
├── cologs/
├── users/
└── ...
```

## 2. 도메인 모듈 구조

각 도메인 폴더(예: `cologs`, `feeds`) 내부는 다음과 같은 표준 구조를 따릅니다.

```text
{domain}/
├── api.ts              # ky를 이용한 순수 fetch 함수 모음
├── types.ts            # 해당 도메인의 Request / Response DTO 타입 정의
├── mutations/          # 데이터 변경(POST, PUT, DELETE)을 위한 Mutation 훅
│   └── use-{name}-mutation.ts
└── queries/            # 데이터 조회(GET)를 위한 Query 훅 및 유틸리티
    ├── keys.ts         # Query Key 팩토리 (캐시 키 일관성 유지)
    └── {query-name}/   # 단일 쿼리별 폴더
        ├── prefetch-query.ts # Server Component에서의 프리패칭 유틸리티
        ├── query-options.ts  # TanStack Query 옵션 객체 정의 (RSC와 Client 공용)
        └── use-query.ts      # Client Component 전용 Query 훅
```

---

## 3. 구성 요소별 구현 규칙

### 3.1 DTO 정의 (`types.ts`)
- 백엔드 API 명세(Swagger)와 1:1로 매핑되는 Request / Response 인터페이스를 정의합니다.
- `shared/api` 계층에서는 외부 API의 원시적인 데이터 구조(DTO)를 그대로 표현합니다.

### 3.2 매퍼 (Mapper) 및 모델 타입 분리 (`features/*/lib`)
- UI 계층(도메인 모델)과 API 응답 스키마는 반드시 분리해야 합니다.
- API 응답 DTO(`*Response`)를 UI 전용 도메인 타입으로 변환하는 **매퍼(Mapper) 함수는 `shared/api`가 아닌, 해당 API 데이터를 소비하는 기능(Feature) 계층의 `lib` 폴더에 위치**시킵니다.
```text
features/
└── {specific-feature}/
    ├── lib/
    │   ├── map-{name}-response.ts      # API 응답을 도메인 모델로 변환하는 유틸
    │   └── map-{name}-response.unit.test.ts # 매퍼 유닛 테스트
    ├── model/
    └── ui/
```
- 매퍼의 인자는 `shared/api/.../types.ts`에서 가져온 DTO 타입을, 반환 값은 `domains/.../model/`에서 가져온 도메인 모델 타입을 사용합니다.

### 3.3 API 호출 함수 (`api.ts`)
- 전역 `apiClient`(`client.ts`)를 사용하여 실제 HTTP 요청을 수행하는 순수 함수를 작성합니다.
- URL 경로나 Query Parameter 가공을 여기서 담당합니다.
- `apiClient`의 `GET`, `POST`, `PUT`, `PATCH`는 JSON 응답을 파싱합니다.
- `apiClient.delete`는 모든 DELETE API가 `204 No Content`를 반환한다는 계약을 따르며, JSON 응답을 고려하지 않고 원본 `Response`를 반환합니다.
```typescript
import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import type { CologCreateRequest, CologCreateResponse } from './types';

export const createColog = (request: CologCreateRequest) =>
  apiClient.post<ApiResponse<CologCreateResponse>>('v1/cologs', { json: request });
```

### 3.4 Query Keys (`queries/keys.ts`)
- 배열 기반의 Query Key를 팩토리 패턴으로 정의합니다.
- 계층적 키 구조를 사용하여 캐시 무효화(Invalidation)를 쉽게 만듭니다.
```typescript
export const blogsQueryKeys = {
  all: ['blogs'] as const,
  postDetail: (slug: string, postId: number) => [...blogsQueryKeys.all, 'posts', slug, postId] as const,
};
```

### 3.5 Query Options (`queries/{name}/query-options.ts`)
- TanStack Query v5의 `queryOptions` 또는 `infiniteQueryOptions`를 사용하여 쿼리 설정을 객체로 분리합니다.
- 이렇게 분리하면 **React Server Component**에서 Prefetch를 할 때와 **Client Component**에서 훅을 사용할 때 동일한 옵션과 키를 보장할 수 있습니다.
```typescript
import { queryOptions } from '@tanstack/react-query';
import { readBlogPublicProfile } from '../../api';
import { blogsQueryKeys } from '../keys';

export const publicProfileQueryOptions = ({ slug }: { slug: string }) =>
  queryOptions({
    queryKey: blogsQueryKeys.publicProfile(slug),
    queryFn: () => readBlogPublicProfile({ slug }),
    staleTime: 60_000,
  });
```

### 3.6 Prefetch Query (`queries/{name}/prefetch-query.ts`)
- App Router의 Server Component에서 초기 데이터를 가져올 때 사용합니다.
- `queryClient.prefetchQuery`에 `queryOptions`를 전달하여 깔끔하게 작성합니다.
```typescript
import type { QueryClient } from '@tanstack/react-query';
import { publicProfileQueryOptions } from './query-options';

export const prefetchPublicProfileQuery = (queryClient: QueryClient, slug: string) =>
  queryClient.prefetchQuery(publicProfileQueryOptions({ slug }));
```

### 3.7 Mutation (`mutations/use-{name}-mutation.ts`)
- 상태 변경이 필요한 작업은 커스텀 훅으로 감싸 `useMutation`을 반환합니다.
- `onSuccess` 콜백에서 관련된 `Query Key`를 무효화(invalidateQueries)하여 최신 데이터를 반영합니다.

## 4. 모범 사례 (Best Practices)

1. **에러 핸들링**: 개별 훅이나 컴포넌트에서 비즈니스 로직 에러를 처리하고, 토큰 만료 등 공통 에러는 `create-ky-instance.ts`의 `ky` hooks(Interceptor)에서 중앙 집중적으로 처리합니다.
2. **Server Component & Hydration**: RSC에서 데이터를 `prefetch` 한 뒤, `<HydrationBoundary>`와 Client Component 내부의 `useSuspenseQuery` / `useQuery`를 결합하여 SSR 시점의 데이터를 클라이언트로 넘기는 패턴을 적극 활용합니다.
3. **명명 규칙**: API 폴더 및 파일 명칭은 Kebab-case를 사용하고, 도메인 이름은 복수형(`blogs`, `cologs`)을 기본으로 합니다.
