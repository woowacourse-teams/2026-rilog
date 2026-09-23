# 프론트엔드 테스트 기준

이 문서는 Rilog 프론트엔드의 기능 추가·수정·리팩터링에서 어떤 동작을 어떤 테스트로 보호할지 정한다. 테스트 개수나 전역 coverage보다 변경으로 깨질 수 있는 사용자 동작과 외부 계약을 우선한다.

현재 실행 가능한 검증 명령과 CI 범위는 [품질 게이트](../harness/quality-gates.md)를 따른다.

## 계층별 책임

| 변경 대상                                        | 작성할 테스트                | 실제로 연결할 대상                           | 대체할 경계                              |
| ------------------------------------------------ | ---------------------------- | -------------------------------------------- | ---------------------------------------- |
| 정책, 유효성 검증, mapper, serializer, query key | `*.unit.test.ts` · Vitest    | 대상 함수와 순수 의존 함수                   | 시간·난수처럼 비결정적인 입력            |
| 입력, 상태 전이, API 소비, 오류·권한 UI          | `*.component.test.tsx` · RTL | 컴포넌트, 관련 hook, 테스트 전용 QueryClient | raw API 함수와 jsdom 미지원 브라우저 API |
| 페이지 전환, SSR, 쿠키·저장소, 핵심 수직 흐름    | `*.spec.ts` · Playwright     | Next.js 앱과 HTTP client                     | 외부 OAuth·업로드, 로컬 테스트 API 경계  |
| 공통 UI와 CSS 배치                               | 제한된 Playwright screenshot | 실제 렌더링과 스타일                         | 가변 데이터·시간·이미지·애니메이션       |

단위 테스트는 입력 조합과 경계값을 충분히 다룬다. 상위 계층에서는 같은 규칙을 반복하지 않고 모듈이 연결된 대표 흐름을 검증한다.

## 작성 규칙

1. 테스트 이름은 **조건에서 행동하면 관찰 가능한 결과가 발생한다** 형식으로 쓴다. 준비 → 실행 → 검증 순서를 따르며 테스트 하나는 하나의 동작 계약을 다룬다.
2. RTL은 role, accessible name, label을 우선해 요소를 찾는다. `data-testid`는 접근 가능한 선택지가 없을 때만 사용한다.
3. URL, query parameter, 요청 payload, 화면 결과, 이동 경로처럼 외부에서 관찰할 수 있는 계약을 검증한다. 내부 state, private 함수, className, 대형 DOM snapshot, 사용자 결과와 무관한 호출 횟수는 성공 기준으로 사용하지 않는다.
4. 임의의 시간 대기 대신 응답, 화면 상태, URL처럼 완료를 확인할 수 있는 조건을 기다린다. retry, skip, snapshot 갱신으로 실패를 숨기지 않는다. 조건부 skip은 이유와 제거 조건을 이슈에 기록한다.
5. 정상 흐름 외에 해당 기능의 빈 상태, 실패·재시도, 권한 거부, 중복 제출을 검토한다. 모든 상태를 모든 계층에 중복 작성하지 않는다.

## mock·fixture·상태 격리

- raw API 경계만 대체한다. RTL 테스트는 컴포넌트와 관련 hook, `QueryClient`를 실제로 연결한다.
- [`render-with-query.ts`](../../frontend/src/test/render-with-query.ts)의 `createTestQueryClient`와 `renderWithQuery`를 우선 사용한다. 테스트마다 새 QueryClient를 만들고 cache를 공유하지 않는다.
- 인증 실패·빈 HTTP 응답은 [`api-response.ts`](../../frontend/src/test/fixtures/api-response.ts)의 helper를 우선 사용한다. 새 fixture는 최소 유효 기본값과 명시적 override를 제공한다.
- 각 테스트가 만든 mock, storage, URL query와 브라우저 상태를 초기화한다. 다른 테스트 실행 순서에 성공을 의존하지 않는다.
- 브라우저 검증 환경을 구성할 때는 SSR과 브라우저가 같은 결정적인 테스트 API·fixture를 사용한다. 등록되지 않은 요청은 실패로 드러나야 한다.

## 주요 기능과 보호 범위

| 기능           | 보호할 동작·계약                                                                                              | 현재 대표 테스트                                                                                                                                                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 피드·공개 탐색 | 유형 × 카테고리, URL·요청·목록 일치, 캐시 분리, 페이지 연결·중복 제거, 빈 결과·실패·재시도, 상세 방문 후 복귀 | [`feed-filter.unit.test.ts`](../../frontend/src/features/post-feed/lib/feed-filter.unit.test.ts), [`PostFeedGrid.component.test.tsx`](../../frontend/src/features/post-feed/ui/PostFeedGrid.component.test.tsx), [`home.spec.ts`](../../frontend/src/test/e2e/home.spec.ts)                                                             |
| 인증·회원가입  | 로그인 후 원래 화면 복귀, 가입 완료 상태, 보호 페이지 접근, 세션 만료 안내                                    | [`SignUpForm.component.test.tsx`](../../frontend/src/features/sign-up/ui/SignUpForm.component.test.tsx), [`login-completion.spec.ts`](../../frontend/src/test/e2e/login-completion.spec.ts), [`sign-up-completion.spec.ts`](../../frontend/src/test/e2e/sign-up-completion.spec.ts)                                                     |
| 글 작성        | 초안 저장·재개·수정·발행, 요청 payload, 실패 시 입력 보존, 중복 제출·이탈                                     | [`UsePostDrafts.component.test.tsx`](../../frontend/src/features/post-write/hooks/UsePostDrafts.component.test.tsx), [`UsePostPublication.component.test.tsx`](../../frontend/src/features/post-write/hooks/UsePostPublication.component.test.tsx), [`write.spec.ts`](../../frontend/src/test/e2e/write.spec.ts)                        |
| 코로그         | 생성, 멤버 초대 성공·부분 실패, OWNER/MEMBER 권한, 저장 결과 반영                                             | [`CologMemberManagementSection.component.test.tsx`](../../frontend/src/features/colog-member-management/ui/CologMemberManagementSection.component.test.tsx), [`colog-create.spec.ts`](../../frontend/src/test/e2e/colog-create.spec.ts), [`colog-profile-settings.spec.ts`](../../frontend/src/test/e2e/colog-profile-settings.spec.ts) |
| 공통 UI        | 모달 포커스 복귀, 버튼 상태, 입력 오류 연결, 대표 화면의 반응형 배치                                          | [`Modal.component.test.tsx`](../../frontend/src/shared/ui/modal/Modal.component.test.tsx), [`Button.component.test.tsx`](../../frontend/src/shared/ui/button/Button.component.test.tsx), [`sidebar.spec.ts`](../../frontend/src/test/e2e/sidebar.spec.ts)                                                                               |

위 표의 “대표 테스트”는 해당 영역의 검증 위치다. 표의 모든 동작이 이미 완전히 보호된다는 뜻은 아니다. 변경 시 보호할 동작과 실제 테스트를 연결해 누락을 보강한다.

## 변경별 완료 조건

| 변경                                   | 필요한 검증                                                    |
| -------------------------------------- | -------------------------------------------------------------- |
| 순수 규칙·mapper·serializer            | 관련 단위 테스트                                               |
| 입력·상태 전이·API 소비                | 관련 RTL 통합 테스트                                           |
| 페이지 연결·인증 경계·핵심 사용자 흐름 | 관련 브라우저 smoke                                            |
| 공통 컴포넌트·스타일                   | 동작 테스트와 대표 소비 화면의 시각적 검증                     |
| 버그 수정                              | 수정 전 실패하고 수정 후 통과하는 가장 낮은 계층의 회귀 테스트 |

PR에는 변경 전 문제, 보호한 동작, 실행 명령과 결과, 실행하지 못한 검증과 이유를 남긴다. 해당하지 않는 검증을 생략할 때에도 이유를 기록한다.

## 로컬 실행과 실패 조사

`frontend/`에서 Node `24.19.0`, pnpm `11.21.0`을 사용한다. `.nvmrc`는 버전을 지정하지만 터미널의 Node를 자동으로 바꾸지는 않는다. `nvm`을 사용하는 경우 먼저 `nvm use`를 실행하고 실제 버전을 확인한다.

```sh
nvm use
node -v
pnpm -v
pnpm install --frozen-lockfile
pnpm check
pnpm test:e2e
```

`node -v`는 `v24.19.0`, `pnpm -v`는 `11.21.0`을 출력해야 한다. 비대화형 셸에서 `nvm` 명령을 찾지 못하면 먼저 `~/.nvm/nvm.sh`를 로드한다. `Unsupported engine` 경고가 나오면 지정된 Node 버전으로 다시 실행한다.

`pnpm check`는 포맷, 린트, 타입, 단위 테스트, 컴포넌트 테스트, production build를 실행하며 E2E는 포함하지 않는다. 좁은 변경은 `pnpm exec vitest run --config vitest-unit.config.ts <파일>` 또는 component config로 검증한다.

실패가 나면 Node/pnpm 버전, 실행 명령, 실패 파일·시나리오, 응답·trace, 같은 커밋에서의 재현 여부를 남긴다. 환경 문제와 제품 회귀를 구분하며 필수 검사를 삭제하거나 약화하지 않는다.

## 기존 테스트 교체 절차

1. 기능의 사용자 동작·외부 계약과 이를 보호하는 기존 테스트를 연결한다.
2. 기준 실행 결과를 기록하고 유지·수정·통합·삭제·재작성 중 하나를 선택한다.
3. 새 기준에 맞는 테스트를 먼저 작성하거나 기존 테스트를 수정한다.
4. 대체 검증이 해당 회귀를 실제로 잡는지 확인한다.
5. 대체 위치 또는 삭제 이유를 내부 작업 기록에 남긴 뒤 중복 테스트와 helper를 제거한다.

테스트 수 감소는 허용한다. 기존에 보호하던 동작이 사라지면 교체가 끝나지 않은 것이다.
