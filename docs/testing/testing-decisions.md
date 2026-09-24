# 프론트엔드 테스트 결정 기록

이 문서는 테스트 하네스의 현재 형태를 만든 결정과 재검토 조건을 기록한다. 세부 작업 로그를 그대로 보존하는 문서가 아니라, 팀원과 에이전트가 같은 문제를 다시 풀 때 필요한 근거를 공개한다.

## 근거 범위

| 이슈·PR                                                                    | 기준 변경                                        | 병합 결과  |
| -------------------------------------------------------------------------- | ------------------------------------------------ | ---------- |
| #603 · [PR #608](https://github.com/woowacourse-teams/2026-rilog/pull/608) | 계층·mock·fixture·로컬 검증 기준 수립            | `9bcdf805` |
| #605 · [PR #616](https://github.com/woowacourse-teams/2026-rilog/pull/616) | E2E를 실제 브라우저 가치가 큰 4건으로 축소       | `85a7bc8f` |
| #604 · [PR #618](https://github.com/woowacourse-teams/2026-rilog/pull/618) | 단위·RTL을 계약 중심으로 정비하고 존재 기준 통일 | `2732addd` |

PR 본문의 주장, 전체 diff와 최종 병합 코드를 대조했다. 충돌할 때는 현재 `develop`의 코드와 실행 가능한 script를 기준으로 삼는다.

## 결정 대응표

| 변경                     | 보호 계약                                      | 선택 이유                                                            | 현재 규칙                                                   | 근거                                         |
| ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| 테스트 계층 정의         | 같은 회귀를 적절한 비용으로 탐지               | 모든 계층에서 같은 입력을 반복하면 수정 비용만 증가                  | 순수 규칙은 unit, 상태·연결은 RTL, 브라우저 소유 동작은 E2E | #608, [테스트 기준](./README.md)             |
| 공통 QueryClient         | retry와 cache가 테스트 사이에 새지 않음        | 파일별 설정은 실패 시간과 상태가 달라짐                              | `createTestQueryClient`를 우선 사용                         | #618, `src/test/render-with-query.ts`        |
| hook 대신 raw API mock   | 실제 query·mutation 연결 보호                  | 검증 대상 hook 전체를 mock하면 cache·payload 연결이 끊김             | 직접 검증하는 hook은 실제 연결, HTTP 경계만 대체            | #618, `UsePostPublishers.component.test.tsx` |
| 책임별 테스트 존재       | 동일 책임 파일의 예측 가능한 보호              | 디렉터리 깊이만으로 모든 파일에 테스트를 만들면 조립 테스트가 중복됨 | raw API·key·options는 직접 검증, 단순 wrapper는 생략        | #618, shared API tests                       |
| 시각 구현 assertion 제거 | 접근성·입력·탐색·overflow 결과                 | 색상·padding·grid 수치는 디자인 수정마다 의미 없이 깨짐              | 시각 class와 정확한 CSS를 고정하지 않음                     | #618의 avatar·feed·profile 테스트 정비       |
| privacy class 유지       | 분석 도구가 민감 정보를 수집하지 않음          | `ph-mask`는 장식이 아니라 외부 수집 경계                             | privacy 목적을 밝힌 class assertion 허용                    | #618, member·editor tests                    |
| E2E 4건 유지             | history, beforeunload, file input, 모바일 정책 | 실제 브라우저가 필요한 회귀만 자동화해야 유지 비용을 통제할 수 있음  | 새 흐름에는 피해·브라우저 필요성·통합 불가 이유 요구        | #616, `write.spec.ts`                        |
| 외부 API 차단            | 계정·공유 데이터 없이 결정적 실행              | 실데이터와 요청 순서 의존은 flaky와 데이터 오염을 만듦               | 필요한 route만 등록하고 나머지 API는 abort                  | #616, authenticated-access fixture           |
| visual 제외              | 현재 팀이 감당할 수 있는 검토 비용 유지        | 6개 기준 PNG와 OS별 갱신은 디자인 변경마다 지속 비용 발생            | screenshot은 실패 진단에만 사용                             | #616 최종 범위                               |
| 범용 테스트 API 제외     | 작은 테스트 환경과 낮은 협업 비용              | 앱 API 전체를 흉내 내는 서버는 별도 제품처럼 유지해야 함             | spec별 최소 route fixture 사용                              | #616 최종 범위                               |

## PR별 적용 결과

### #603 · 기준 수립

- Node 24.19.0과 pnpm 11.21.0을 검증 환경으로 고정하고 `pnpm check`와 별도 E2E의 책임을 구분했다.
- 컴포넌트 전체 실행의 동시성 timeout을 재현한 뒤 `maxWorkers: 2`를 설정했다. 단독 통과만으로 flaky가 해결됐다고 판단하지 않았다.
- release note의 특정 버전·전체 문구를 복제하던 테스트를 제거하고 날짜 우선순위, 빈 목록과 동률 처리 정책을 남겼다.
- 공용 기준은 `docs/testing`, 상세 실행 로그는 ignored `frontend/.docs/testing`에 두도록 역할을 나눴다.
- 개인 도구와 내부 문서를 제품 lint·format 대상에서 분리했다. 제품 source 자체는 제외하지 않았다.
- 전역 coverage hard gate, Storybook과 새 테스트 프레임워크는 반복되는 필요가 없어서 도입하지 않았다.

### #605 · 브라우저 검증 축소

- 12개 spec·94건을 `write.spec.ts` 1개·4건으로 줄였다. 삭제 수를 목표로 삼지 않고 실제 browser API가 필요한 계약만 선택했다.
- 피드 SSR·filter·history·scroll, 로그인·가입 callback, 코로그 생성·설정·위험 영역, sidebar·profile navigation, release note와 BlockNote 스타일 E2E를 제거했다.
- 인증 refresh, 사용자 정보, 게시글 수, 초안 목록, 코로그 목록과 업로드 요청은 spec 가까이의 최소 route로 대체했다.
- 등록하지 않은 `/v1` 요청은 abort하고 API base를 닫힌 loopback으로 고정했다. master token과 분석 전송은 비활성화했다.
- worker 1개, retry 0회를 적용했다. 삭제된 수직 흐름은 완전히 대체됐다고 주장하지 않고 자동화 공백으로 기록했다.
- Playwright report와 test result를 제품 lint·format 대상에서 분리했다.
- visual snapshot 6개와 범용 test API 초안은 최종 변경에서 제외했다.

### #604 · 단위·RTL 정비

- avatar, sidebar, feed, profile, modal의 색상·크기·padding·grid·shadow assertion을 제거하고 접근성·입력·링크·상태 전이를 유지했다.
- `ph-mask`·`ph-no-capture`는 분석 privacy 계약으로 구분해 유지했다.
- mutation 테스트가 파일별 QueryClient를 만들지 않고 `createTestQueryClient`를 사용하도록 통일했다.
- 글 발행 연결에서 query·mutation hook mock을 제거하고 실제 hook과 raw API 경계를 연결했다.
- raw API 10개, query key 6개, query options 13개가 같은 책임별 직접 테스트를 갖도록 누락을 보강했다.
- 독립 상태·분기·이벤트가 있던 UI 5개의 테스트를 보강했다. 부모가 같은 계약을 실제 실행하는 조립 자식에는 중복 테스트를 만들지 않았다.
- 단순 prefetch wrapper와 부수효과 없는 upload mutation wrapper 테스트를 제거했다.
- 임시 결함으로 발행 slug payload, 생성 실패 후 입력 보존과 설정 권한 거부 검출을 확인하고 원복했다.

## 병합 전 로컬 검증 기록

| 기준                   | 결과                                                     | 해석                                           |
| ---------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| #603 최종 `pnpm check` | unit 399건, component 768건과 build 통과                 | component worker 제한 적용 기준                |
| #605 E2E               | 1파일 4건, 연속 실행 13.506초·10.792초                   | 이전 94건의 전체 시간과 직접 비교하지 않음     |
| #604 최종 `pnpm check` | unit 102파일 410건, component 162파일 769건과 build 통과 | 보강으로 시간이 늘어 속도 개선을 주장하지 않음 |

이 수치는 병합 전에 수집한 로컬 검증 기록이며 병합 커밋에서 다시 실행한 결과가 아니다. 파일·case 수나 실행 시간 변화는 같은 환경과 커밋을 명시해 새로 측정한다.

## 기각하거나 폐기한 접근

### 대형 E2E suite 보존

기존 12개 spec·94건은 피드, 인증, 코로그, 설정, release note, BlockNote 스타일을 함께 다뤘다. 실제 데이터·고정 대기·CSS 구현 의존 때문에 수정 비용이 높았다. 테스트 개수를 보존하기 위해 일대일 재작성하지 않고 브라우저 소유 계약 4건만 남겼다.

삭제된 브라우저 검증이 unit·RTL로 모두 대체됐다는 뜻은 아니다. 피드 SSR·브라우저 로그인 callback·코로그 수직 흐름은 자동 브라우저 검증 공백으로 남아 있다. 해당 기능을 바꿀 때 PR에 수동 검증 또는 새 E2E의 필요성을 기록한다.

### visual snapshot

피드·상세·발행 모달의 데스크톱·모바일 PNG 6개 초안은 운영하지 않기로 했다. OS·Playwright 버전, 폰트와 디자인 변경에 따른 기준 갱신 비용이 현재 보호 가치보다 컸다. CI screenshot은 기준 비교가 아니라 실패 당시 상태를 조사하는 artifact다.

### 범용 frontend test API

인증·피드·초안·발행·코로그를 모두 흉내 내는 Node 서버 초안은 제거했다. 상태 전이까지 정확히 복제하려면 운영 API와 병렬로 계약을 유지해야 한다. 현재 E2E는 필요한 요청만 spec 가까이에서 대체한다.

### coverage와 테스트 개수 목표

coverage 비율이나 파일·case 감축률을 완료 조건으로 사용하지 않는다. 접근되지 않는 중요한 실패 경로와 의미 없는 getter 테스트가 같은 숫자로 계산되기 때문이다. 파일·case 수와 시간은 변화 설명을 위한 측정값이며 품질 목표가 아니다.

## 알려진 한계

- 자동 E2E는 글쓰기 4건만 다루며 피드·인증·코로그·설정의 전체 수직 흐름을 보장하지 않는다.
- jsdom은 문서 간 navigation 같은 브라우저 동작을 완전히 구현하지 않는다. 관련 메시지와 실제 실패를 구분한다.
- production E2E는 닫힌 loopback API와 route fixture를 사용하므로 운영 API 호환성 검증이 아니다.
- 상위 조립 테스트에서 별도 검증된 hook을 mock한 경우 API·cache 연결은 그 테스트의 증명 범위가 아니다.
- 편집기 double을 사용한 테스트는 BlockNote 자체의 selection·paste·layout 동작을 증명하지 않는다.

## 재검토 조건

- 같은 브라우저 회귀가 반복되거나 수동 검증 누락이 릴리즈 장애로 이어지면 해당 수직 흐름의 E2E를 재검토한다.
- 안정적인 디자인 시스템과 고정 CI 렌더링 환경이 생기고 실제 시각 회귀가 반복되면 제한된 visual 도입을 별도 이슈로 검토한다.
- route fixture가 여러 spec에서 중복되고 상태 전이 불일치가 발생하면 작은 공통 fixture 또는 테스트 서버를 검토한다.
- required check 승격은 반복 실행의 안정성, 진단 가능성, 소유자와 예외 절차가 확인된 뒤 진행한다.
- API·분석·SEO 공개 계약이 바뀌면 담당 계층과 대표 테스트 표를 같은 PR에서 갱신한다.
