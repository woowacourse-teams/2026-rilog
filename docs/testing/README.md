# 프론트엔드 테스트 기준

이 문서는 Rilog 프론트엔드의 기능 추가·수정·리팩터링에서 어떤 동작을 어떤 테스트로 보호할지 정한다. 테스트 개수나 전역 coverage보다 변경으로 깨질 수 있는 사용자 동작과 외부 계약을 우선한다.

현재 실행 가능한 검증 명령과 CI 범위는 [품질 게이트](../harness/quality-gates.md)를 따른다.

## 문서 지도

- 이 문서: 테스트 선택, 계층, mock, 존재 여부와 완료 조건의 기준
- [테스트 작성 패턴](./testing-patterns.md): 현재 코드에서 재사용할 예시와 실패 조사 절차
- [테스트 결정 기록](./testing-decisions.md): #603~#605에서 선택·기각한 방식과 재검토 조건
- [프론트엔드 품질 게이트](../harness/quality-gates.md): 로컬·CI 실행 명령, trigger와 artifact

테스트를 추가·수정·삭제하기 전에 아래 순서로 판단한다.

1. 실패했을 때의 사용자 피해나 외부 계약을 한 문장으로 적는다.
2. 같은 책임의 코드와 기존 테스트를 찾아 직접 검증 또는 상위 검증 위치를 확인한다.
3. 그 회귀를 가장 낮은 적절한 계층에서 잡을 수 있는지 판단한다.
4. 실제로 연결할 대상과 대체할 실행 환경 경계를 정한다.
5. 집중 검증 후 대체 위치, 삭제 이유, 미실행 검증과 남은 공백을 기록한다.

테스트 파일이 존재한다는 사실만으로 보호된 계약으로 보지 않는다. 부모 테스트가 자식을 mock하거나 해당 경로를 실행하지 않으면 자식의 대체 검증이 아니다.

## 계층별 책임

| 변경 대상                                        | 작성할 테스트                | 실제로 연결할 대상                           | 대체할 경계                              |
| ------------------------------------------------ | ---------------------------- | -------------------------------------------- | ---------------------------------------- |
| 정책, 유효성 검증, mapper, serializer, query key | `*.unit.test.ts` · Vitest    | 대상 함수와 순수 의존 함수                   | 시간·난수처럼 비결정적인 입력            |
| 입력, 상태 전이, API 소비, 오류·권한 UI          | `*.component.test.tsx` · RTL | 컴포넌트, 관련 hook, 테스트 전용 QueryClient | raw API 함수와 jsdom 미지원 브라우저 API |
| History·beforeunload·파일 입력·기기 정책         | `*.spec.ts` · Playwright     | 실제 브라우저와 최소 앱 연결                 | 테스트별 브라우저 요청 mock              |

단위 테스트는 입력 조합과 경계값을 충분히 다룬다. 상위 계층에서는 같은 규칙을 반복하지 않고 모듈이 연결된 대표 흐름을 검증한다.

## 작성 규칙

1. 테스트 이름은 **조건에서 행동하면 관찰 가능한 결과가 발생한다** 형식으로 쓴다. 준비 → 실행 → 검증 순서를 따르며 테스트 하나는 하나의 동작 계약을 다룬다.
2. RTL은 role, accessible name, label을 우선해 요소를 찾는다. `data-testid`는 접근 가능한 선택지가 없을 때만 사용한다.
3. URL, query parameter, 요청 payload, 화면 결과, 이동 경로처럼 외부에서 관찰할 수 있는 계약을 검증한다. 내부 state, private 함수, 시각 구현 className, 대형 DOM snapshot, 사용자 결과와 무관한 호출 횟수는 성공 기준으로 사용하지 않는다. 분석 privacy masking class는 수집 경계 계약으로 검증할 수 있다.
4. 임의의 시간 대기 대신 응답, 화면 상태, URL처럼 완료를 확인할 수 있는 조건을 기다린다. retry, skip, snapshot 갱신으로 실패를 숨기지 않는다. 조건부 skip은 이유와 제거 조건을 이슈에 기록한다.
5. 정상 흐름 외에 해당 기능의 빈 상태, 실패·재시도, 권한 거부, 중복 제출을 검토한다. 모든 상태를 모든 계층에 중복 작성하지 않는다.

## mock·fixture·상태 격리

- raw API 경계만 대체한다. RTL 테스트는 컴포넌트와 관련 hook, `QueryClient`를 실제로 연결한다.
- [`render-with-query.ts`](../../frontend/src/test/render-with-query.ts)의 `createTestQueryClient`와 `renderWithQuery`를 우선 사용한다. 테스트마다 새 QueryClient를 만들고 cache를 공유하지 않는다.
- 직접 검증하는 query·mutation hook을 mock하지 않는다. 상위 조립 UI가 별도로 검증된 server-state hook의 결과만 소비할 때는 해당 hook을 실행 환경 경계로 대체할 수 있다.
- 인증 실패·빈 HTTP 응답은 [`api-response.ts`](../../frontend/src/test/fixtures/api-response.ts)의 helper를 우선 사용한다. 새 fixture는 최소 유효 기본값과 명시적 override를 제공한다.
- 각 테스트가 만든 mock, storage, URL query와 브라우저 상태를 초기화한다. 다른 테스트 실행 순서에 성공을 의존하지 않는다.
- E2E는 필요한 브라우저 요청만 `page.route`로 대체하고 그 외 API 요청을 실패시킨다. 범용 mock 서버나 제품 API 전체 fixture를 만들지 않는다.

## 테스트 존재 기준

- raw API 함수, query key factory와 query options factory는 같은 책임의 파일마다 직접 테스트를 둔다.
- `use-query`와 `prefetch-query`처럼 검증된 options를 그대로 전달하는 wrapper는 직접 테스트하지 않는다.
- query cache·session·payload 변환 같은 부수효과가 있는 mutation hook은 직접 테스트한다. raw API를 그대로 호출하는 mutation wrapper는 소비 기능의 통합 테스트로 보호한다.
- 독립적인 상태·분기·사용자 이벤트가 있는 UI는 직접 테스트한다. 부모 통합 테스트가 같은 계약을 모두 실행하는 조립 전용 자식은 별도 테스트를 만들지 않는다.
- 타입 선언, 상수 모음, 스타일 정의와 정적 조립 파일은 독립적인 런타임 계약이 생기기 전까지 테스트를 만들지 않는다.

## 주요 기능과 보호 범위

| 기능           | 보호할 동작·계약                                           | 현재 대표 테스트                                                                                                                                                                                                                                                                                                 |
| -------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 피드·공개 탐색 | 필터 요청·목록 연결·중복 제거·빈 결과·실패·재시도          | [`feed-filter.unit.test.ts`](../../frontend/src/features/post-feed/lib/feed-filter.unit.test.ts), [`PostFeedGrid.component.test.tsx`](../../frontend/src/features/post-feed/ui/PostFeedGrid.component.test.tsx)                                                                                                  |
| 인증·회원가입  | callback 처리, 가입 상태, 보호 페이지 접근, 세션 만료 안내 | [`AuthSession.component.test.tsx`](../../frontend/src/features/auth/ui/AuthSession.component.test.tsx), [`SignUpForm.component.test.tsx`](../../frontend/src/features/sign-up/ui/SignUpForm.component.test.tsx)                                                                                                  |
| 글 작성        | 초안·발행 상태, 업로드, 이탈 방지와 모바일 접근 정책       | [`UsePostDrafts.component.test.tsx`](../../frontend/src/features/post-write/hooks/UsePostDrafts.component.test.tsx), [`UsePostPublication.component.test.tsx`](../../frontend/src/features/post-write/hooks/UsePostPublication.component.test.tsx), [`write.spec.ts`](../../frontend/src/test/e2e/write.spec.ts) |
| 코로그         | 생성 입력, 멤버 초대·권한·저장 결과                        | [`CologCreateForm.component.test.tsx`](../../frontend/src/features/colog-create/ui/CologCreateForm.component.test.tsx), [`CologMemberManagementSection.component.test.tsx`](../../frontend/src/features/colog-member-management/ui/CologMemberManagementSection.component.test.tsx)                              |
| 공통 UI        | 모달 focus·닫기 정책, 버튼 상태와 접근 가능한 이름         | [`Modal.component.test.tsx`](../../frontend/src/shared/ui/modal/Modal.component.test.tsx), [`Button.component.test.tsx`](../../frontend/src/shared/ui/button/Button.component.test.tsx)                                                                                                                          |

위 표의 “대표 테스트”는 해당 영역의 검증 위치다. 표의 모든 동작이 이미 완전히 보호된다는 뜻은 아니다. 변경 시 보호할 동작과 실제 테스트를 연결해 누락을 보강한다.

## 변경별 완료 조건

| 변경                                     | 필요한 검증                                                    |
| ---------------------------------------- | -------------------------------------------------------------- |
| 순수 규칙·mapper·serializer              | 관련 단위 테스트                                               |
| 입력·상태 전이·API 소비                  | 관련 RTL 통합 테스트                                           |
| History·beforeunload·파일 입력·기기 정책 | 관련 글쓰기 E2E                                                |
| 공통 컴포넌트·스타일                     | 관련 RTL과 필요 viewport의 수동 확인                           |
| 버그 수정                                | 수정 전 실패하고 수정 후 통과하는 가장 낮은 계층의 회귀 테스트 |

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

### 브라우저 검증의 실행 전제

`test:e2e`는 Playwright와 `pnpm dev`를 사용해 글쓰기 브라우저 흐름 4건을 실행한다. API 주소는 폐쇄된 loopback으로 고정하고 필요한 인증·목록·업로드 요청만 해당 spec에서 대체한다.

```sh
pnpm test:e2e
pnpm test:e2e --list
pnpm test:e2e src/test/e2e/write.spec.ts
pnpm test:e2e:prod
```

- 자동 E2E는 작성 중 뒤로가기, 새로고침 경고, 파일 선택 업로드, 모바일 접근 정책만 보호한다.
- `test:e2e:prod`는 사전에 같은 환경변수로 완료한 production build를 `pnpm start`로 검증하며 기존 서버를 재사용하지 않는다. 이 명령은 필수 4개 흐름 전체를 검사하므로 일부 파일·grep 선택은 누락 실패로 처리한다.
- 피드·인증·코로그·설정의 실제 브라우저 통합과 순수 시각 회귀는 자동 검증 범위가 아니다. 관련 기능 변경 시 하위 테스트와 필요한 수동 검증을 PR에 기록한다.
- screenshot 기준 이미지 비교와 범용 테스트 API는 운영하지 않는다.
- 새 E2E에는 사용자 피해, 브라우저가 필요한 이유, 기존 4건에 통합할 수 없는 이유를 기록한다.
- 필수 E2E 태그 4개 중 누락·중복·skip·실패가 있으면 실행이 실패한다. 태그와 보호 계약은 [작성 패턴](./testing-patterns.md)을 따른다.

실패가 나면 Node/pnpm 버전, 실행 명령, 실패 파일·시나리오, 응답·trace, 같은 커밋에서의 재현 여부를 남긴다. 환경 문제와 제품 회귀를 구분하며 필수 검사를 삭제하거나 약화하지 않는다.

## 기존 테스트 교체 절차

1. 기능의 사용자 동작·외부 계약과 이를 보호하는 기존 테스트를 연결한다.
2. 기준 실행 결과를 기록하고 유지·수정·통합·삭제·재작성 중 하나를 선택한다.
3. 새 기준에 맞는 테스트를 먼저 작성하거나 기존 테스트를 수정한다.
4. 대체 검증이 해당 회귀를 실제로 잡는지 확인한다.
5. 대체 위치 또는 삭제 이유를 내부 작업 기록에 남긴 뒤 중복 테스트와 helper를 제거한다.

테스트 수 감소는 허용한다. 기존에 보호하던 동작이 사라지면 교체가 끝나지 않은 것이다.

## 리뷰 체크리스트

- 테스트 이름만 읽어도 조건·행동·관찰 결과를 알 수 있는가?
- 같은 실패를 더 낮은 계층에서 이미 잡고 있지 않은가?
- 검증 대상 hook·QueryClient·HTTP client가 실제로 연결돼 있는가?
- mock이 브라우저·네트워크·분석처럼 실행 환경 경계에 머무르는가?
- className·정확한 CSS·private state·라이브러리 내부 구현을 제품 계약으로 고정하지 않았는가?
- 실패 후 입력 보존, 권한 거부, 중복 제출처럼 실제 위험이 있는 실패 경로를 검토했는가?
- 추가한 공통 helper가 현재 반복되는 준비를 실제로 줄이고 책임을 흐리지 않는가?
- skip·retry·timeout 증가·광범위한 snapshot 갱신으로 실패를 숨기지 않았는가?
- E2E 추가라면 사용자 피해, 브라우저가 필요한 이유, 기존 필수 흐름에 통합할 수 없는 이유가 있는가?
