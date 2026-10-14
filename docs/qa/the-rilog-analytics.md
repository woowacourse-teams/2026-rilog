# 더 리로그 이용 분석

[더 리로그 이용 현황 대시보드](https://us.posthog.com/project/573633/dashboard/2209279)는 Rilog. 프로젝트의 최근 7일을 한국 시간 기준으로 보여준다. `www.rilog.kr`에서 수집한 이벤트만 포함하고 기존 테스트 계정 cohort를 제외한다.

## 이벤트와 집계

| 이벤트                         | 의미                                             |
| ------------------------------ | ------------------------------------------------ |
| `the rilog viewed`             | 페이지 진입당 한 번. 새로고침과 재방문은 새 방문 |
| `the rilog headline clicked`   | 데일리 헤드라인 전체 클릭                        |
| `the rilog enterprise clicked` | 기업 기사 전체 클릭                              |
| `the rilog personal clicked`   | 개인 기사 전체 클릭                              |
| `the rilog engagement updated` | 페이지가 화면에 보인 누적 시간                   |

더 리로그 방문 ID는 `the_rilog_visit_id`, 클릭 ID는 `the_rilog_click_id`다. 클릭에는 `post_id`, `content_type`, 영역 내 1부터 시작하는 `position`, `navigation_type`을 기록한다. 헤드라인에만 `headline_id`를 추가하며 제목과 본문은 수집하지 않는다. 기사 수는 집계 조건으로 고정하지 않는다.

일반 클릭과 Enter는 같은 탭 이동으로, Ctrl/Cmd/Shift 클릭과 가운데 버튼 클릭은 새 탭/창 이동으로 집계한다. hover와 prefetch는 클릭으로 세지 않는다. 취소된 이동은 상세 유입 정보를 남기지 않는다.

같은 탭에서 상세가 열리면 기존 `post detail viewed`에 `entry_source: the_rilog`와 클릭 정보를 추가한다. 해당 상세의 `post reading progress`도 같은 클릭 정보를 유지한다. 다른 게시글이나 새 읽기 방문은 이전 유입 정보를 재사용하지 않는다. 새 탭 클릭은 클릭수에 포함하지만 상세 도착/읽기 연결은 보장하지 않는다.

## 대시보드의 시간과 전환 지표

- 방문수와 세 종류 클릭수는 이벤트 횟수다. 한 사람이 여러 번 클릭하면 각각 센다.
- 더 리로그 시간은 처음 0초, 화면 표시 중 15초마다, 탭 숨김과 이탈 때 누적값을 기록한다. 다른 탭에 둔 시간은 제외한다.
- 더 리로그 평균 체류 시간은 방문 ID별 `engagement_seconds`의 최댓값을 구한 뒤 평균한다.
- 상세 평균 체류 시간은 더 리로그 유입인 읽기 방문 ID별 누적 시간의 최댓값을 구한 뒤 콘텐츠 종류별로 평균한다.
- 상세 도착률은 같은 탭 클릭 ID 중 이후 상세 도착이 확인된 비율이다. 새 탭 클릭은 분모에서 제외한다.
- 기사/헤드라인 및 위치별 클릭수 표는 기본 합계를 더 자세히 나눠 보는 용도다.

화면 표시 시간은 실제 독서를 보장하지 않는다. 헤드라인은 본문 중간으로 이동할 수 있으므로 기존 스크롤 50% 도달을 읽기 완료로 해석하지 않는다. 브라우저 강제 종료나 전송 차단으로 마지막 상태가 빠지면 시간이 적게 기록될 수 있다. 신규 이벤트 배포 전 기간에는 데이터가 없다.

## 로컬 검증

Node와 pnpm은 `frontend/.nvmrc` 및 `package.json`의 버전을 사용한다.

```sh
cd frontend
node scripts/create-the-rilog-fixture.mjs
THE_RILOG_SNAPSHOT_PATH=.the-rilog-build/fixture.json THE_RILOG_ALLOW_FIXTURE=true NEXT_PUBLIC_API_BASE_URL=https://api.rilog.test pnpm prepare:the-rilog
THE_RILOG_ALLOW_FIXTURE=true NEXT_PUBLIC_API_BASE_URL=https://api.rilog.test NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_playwright_local NEXT_PUBLIC_POSTHOG_HOST=https://posthog.rilog.test NEXT_PUBLIC_POSTHOG_OPT_OUT_USERAGENT_FILTER=false pnpm check
THE_RILOG_ALLOW_FIXTURE=true NEXT_PUBLIC_API_BASE_URL=https://api.rilog.test NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_playwright_local NEXT_PUBLIC_POSTHOG_HOST=https://posthog.rilog.test NEXT_PUBLIC_POSTHOG_OPT_OUT_USERAGENT_FILTER=true pnpm build
PLAYWRIGHT_PORT=3094 pnpm exec playwright test --config playwright.the-rilog-analytics.config.ts
```

분석 전용 빌드에서는 자동화 브라우저도 SDK 이벤트를 보내도록 설정한다. 이 설정은 운영 빌드에 적용하지 않는다. 분석 브라우저 검증은 별도 testDir와 테스트 프로젝트 토큰을 사용한다. 모든 PostHog 요청을 `https://posthog.rilog.test`에서 로컬로 처리하며 운영에 테스트 이벤트를 전송하지 않는다. 실제 Next 링크, 본문 앵커, 키보드/가운데 버튼 이동, SDK 전송 payload와 상세 유입 연결을 함께 검증한다. 기존 E2E의 분석 비활성화 설정과 필수 흐름은 유지한다.

운영 배포 후에는 실제 방문과 클릭으로 신규 이벤트 수집 및 대시보드 반영을 확인한다. 대시보드 저장/쿼리 실행 성공은 실제 운영 이벤트 수집의 증거와 구분한다.
