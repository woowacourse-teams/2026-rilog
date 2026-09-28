# 프론트엔드 테스트 작성 패턴

이 문서는 [테스트 기준](./README.md)을 현재 Rilog 코드에 적용하는 방법을 보여준다. 예시는 복사할 코드 조각보다 책임과 경계를 설명하기 위해 선택했다. 링크의 구현이 바뀌면 같은 계약을 보호하는 최신 테스트로 예시를 교체한다.

## 보호 계약부터 쓰기

구현 전에 아래 네 줄을 정한다.

```text
사용자 피해: 저장 실패 뒤 작성 내용이 사라진다.
보호 계약: 실패해도 입력과 재시도 가능 상태를 유지한다.
담당 계층: 기능 통합 RTL
대체 경계: raw API 요청만 실패시킨다.
```

함수명, DOM 구조, hook 호출 횟수만으로는 보호 계약을 설명할 수 없다. 테스트가 실패했을 때 사용자가 겪는 문제나 외부 소비자가 받는 잘못된 값을 설명할 수 있어야 한다.

## 계층별 연결과 mock

### 순수 로직

mapper, validation, serializer, query key는 대상 함수와 순수 의존 함수를 실제로 호출한다. 정상 입력만 나열하지 않고 경계값, 입력 불변성과 오류를 검증한다. 시간·난수처럼 결과를 비결정적으로 만드는 입력만 고정한다.

피해야 할 형태는 구현의 조건문을 그대로 옮긴 테스트 표다. 입력 조합마다 서로 다른 제품 결과가 없으면 대표 경계로 통합한다.

### raw API

raw API 테스트는 실제 HTTP client를 통과시키고 `fetch`에서 멈춘다. method, resource URL, 정규화된 payload, 응답과 오류 형식을 검증한다. [게시글 API 테스트](../../frontend/src/shared/api/posts/api.unit.test.ts)는 slug 정규화와 요청 본문을 함께 보호한다.

```ts
const request = fetchMock.mock.calls[0]?.[0] as Request;
expect(request.method).toBe("POST");
expect(request.url).toBe("https://api.rilog.test/v1/posts");
expect(capturedBody).toEqual(expect.objectContaining({ slug: "rilog-team" }));
```

API 함수를 mock한 뒤 그 mock이 호출됐는지만 확인하면 HTTP 계약을 검증한 것이 아니다.

### query options와 wrapper

query key와 options factory는 cache identity와 raw API 연결을 소유하므로 직접 테스트한다. [내 정보 query options 테스트](../../frontend/src/shared/api/users/queries/my-info/query-options.unit.test.ts)는 key와 abort signal 전달을 검증한다.

현재 일부 직접 `queryFn` 호출 테스트는 정상 query context를 만들지 못해 `as never`를 사용한다. 이는 기존 보완 대상으로 기록한다. 새 테스트는 실제 QueryClient로 실행하거나 `client`, `queryKey`, `signal`, `meta`를 갖춘 query context를 만들어 타입을 만족시킨다.

검증된 options를 `useQuery` 또는 `prefetchQuery`에 그대로 전달하는 wrapper는 별도 테스트를 만들지 않는다. wrapper에 select, enabled, cache 갱신 같은 독립 동작이 생기면 직접 테스트 대상을 다시 검토한다.

### mutation

cache invalidation, session 갱신, payload 변환, 분석 failure stage를 소유하는 mutation은 실제 hook과 테스트별 QueryClient를 연결한다. [글 발행 연결 테스트](../../frontend/src/widgets/post-write/hooks/UsePostPublishers.component.test.tsx)는 내부 mutation hook을 대체하지 않고 raw API만 실패시킨다.

```ts
vi.spyOn(postsApi, "publishPost").mockRejectedValue(requestError);
const { result } = renderHook(() => usePublishNewPost(), {
  wrapper: createWrapper(),
});
const error = await result.current(command).catch((cause: unknown) => cause);
expect(getAnalyticsFailureStage(error)).toBe("publish_request");
```

raw API 호출을 그대로 반환하며 cache나 session 부수효과가 없는 mutation wrapper는 소비 기능의 통합 테스트로 보호한다.

### 기능 통합 RTL

컴포넌트, 관련 hook과 QueryClient를 실제로 연결하고 raw API와 jsdom 미지원 API만 대체한다. 테스트마다 [createTestQueryClient](../../frontend/src/test/render-with-query.ts)를 사용해 retry를 끄고 cache를 격리한다.

상위 조립 UI가 이미 직접 검증된 server-state hook의 결과에 따라 화면만 조립한다면 hook을 대체할 수 있다. 이 테스트는 조립 결과만 증명하며 API·cache 연결을 증명한다고 보고하지 않는다.

### 무거운 편집기

BlockNote 같은 편집기를 test double로 바꾼 상위 테스트는 입력 문서와 저장·발행 연결만 보호한다. 붙여넣기, selection, slash menu, 파일 입력처럼 편집기나 브라우저가 소유한 동작은 실제 편집기 RTL 또는 Playwright에서 검증한다.

## 사용자 결과를 검증하기

### 선택자와 assertion

RTL 선택자는 role과 accessible name, label, 필요한 text, test ID 순서로 선택한다. callback payload가 공개 계약이면 spy를 사용할 수 있고, 중복 제출 방지처럼 횟수 자체가 정책이면 호출 횟수를 검증할 수 있다.

시각 class나 정확한 크기 대신 접근성 상태와 실제 결과를 확인한다.

```ts
expect(titleField).toHaveAttribute("aria-invalid", "true");
expect(titleField).toHaveAttribute("aria-describedby", error.id);
```

[제목 입력 테스트](../../frontend/src/features/post-write/ui/PostTitleField.component.test.tsx)는 주입한 `scrollHeight`를 높이에 반영하는 연결을 검증한다. 실제 브라우저에서 긴 제목이 잘리지 않는지나 overflow가 발생하지 않는지까지 증명하지는 않는다. 임의의 `96px`을 제품 계약으로 고정하지 않는다.

`ph-mask`와 `ph-no-capture`는 장식 class가 아니라 분석 수집 경계다. privacy 회귀를 막는 테스트에서는 class 자체를 검증할 수 있다.

### 실패와 권한

모든 기능에 모든 오류를 기계적으로 추가하지 않는다. 실제 위험이 있는 입력 보존, 권한 거부, 중복 제출, 부분 실패와 재시도 가능 상태를 검토한다.

[코로그 생성 폼 테스트](../../frontend/src/features/colog-create/ui/CologCreateForm.component.test.tsx)는 raw API 실패 후 입력과 제출 상태를 확인한다. 권한 hook 테스트는 OWNER·ADMIN·MEMBER 결과가 화면 접근 정책으로 이어지는지를 검증한다.

### 비동기 완료 조건

`findBy`, `waitFor`, URL, 요청 완료, focus와 상태 변화를 기다린다. 실제 시간 sleep이나 timeout 증가는 완료 조건이 아니다. 가입 완료처럼 중간 상태의 순서가 계약이면 테스트가 직접 해제하는 Promise barrier를 사용한다.

## 상태와 fixture 격리

- QueryClient는 테스트마다 새로 만들고 종료 시 cache를 공유하지 않는다.
- mock, fake timer, environment, storage, 직접 추가한 DOM과 global stub은 사용한 범위에서 복원한다.
- fixture는 기존 DTO를 만족하는 최소 유효값과 사례별 override를 사용한다.
- 실제 게시글 ID, 현재 릴리즈 문구, 배열의 우연한 순서처럼 계약이 아닌 값을 고정하지 않는다.
- 의도적으로 잘못된 입력을 검증할 때만 좁은 타입 우회를 사용하고 이유를 테스트 가까이에 둔다.
- 공통 factory나 DSL은 현재 반복되는 사용 사례가 없으면 만들지 않는다.

## E2E 패턴

[글쓰기 E2E](../../frontend/src/test/e2e/write.spec.ts)는 실제 브라우저가 소유한 네 계약만 보호한다.

| 필수 태그                           | 보호 계약                                 |
| ----------------------------------- | ----------------------------------------- |
| `@required-e2e-write-history`       | 뒤로가기 취소·확인과 작성 내용 유지       |
| `@required-e2e-write-reload`        | beforeunload 취소와 작성 내용 유지        |
| `@required-e2e-write-file-upload`   | 파일 입력·업로드 응답·편집기 이미지 연결  |
| `@required-e2e-mobile-write-policy` | 모바일에서 편집기를 만들지 않는 접근 정책 |

필요한 인증·목록·업로드 요청만 `page.route`로 대체하고 등록하지 않은 API 요청은 실패시킨다. 공유 API, 실제 계정, 범용 mock 서버를 사용하지 않는다.

새 E2E를 추가하려면 다음 세 가지를 PR에 쓴다.

1. 실패할 때 사용자가 겪는 피해
2. RTL이 아니라 실제 브라우저가 필요한 이유
3. 기존 필수 흐름에 통합할 수 없는 이유

## 실패 조사

1. Node·pnpm 버전과 정확한 명령을 기록한다.
2. 같은 커밋에서 대상 파일 단독 실행과 전체 gate를 구분한다.
3. 요청·화면·URL·trace로 제품, 테스트, 환경 원인을 나눈다.
4. 변경 전에도 재현되는지 확인해 baseline failure와 신규 failure를 구분한다.
5. stale build cache나 포트 충돌은 소유 프로세스와 경로를 확인한 뒤 정리한다.
6. skip, retry, timeout 증가, assertion 완화로 신규 실패를 숨기지 않는다.

CI의 브라우저 실패는 `test-results`의 screenshot·trace·JSON과 `playwright-report`를 함께 확인한다. 로컬 통과와 GitHub Actions 통과는 별도 증거로 기록한다.
