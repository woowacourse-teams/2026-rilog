# 데스크톱 댓글 패널 측정

실제 Next 게시글 상세·본문·댓글 패널을 일반 production 빌드로 측정한다. 애플리케이션에 테스트 route나 계측 코드를 넣지 않는다. 기존 lockfile의 Playwright를 사용한다.

## 준비

Node 24.19.0 / pnpm 11.21.0을 적용한다. 기준과 후보를 별도 checkout에 두고 동일한 의존성, 환경변수와 빌드 옵션을 사용한다. 기준 SHA와 후보 patch SHA 또는 commit SHA를 기록한다. 매거진 입력은 저장소 QA 안내대로 fixture를 준비한다.

```sh
node test-harness/performance/capture-comment-fixture.mjs "$RILOG_PERF_OUTPUT/fixture"
node scripts/create-the-rilog-fixture.mjs
THE_RILOG_ALLOW_FIXTURE=true THE_RILOG_SNAPSHOT_PATH=.the-rilog-build/fixture.json pnpm prepare:the-rilog
NEXT_PUBLIC_API_BASE_URL=https://api.rilog.test NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN= NEXT_PUBLIC_SENTRY_DSN= NEXT_PUBLIC_SENTRY_ENABLED=false SENTRY_UPLOAD_REQUIRED=false pnpm build
```

캡처 대상은 공개 GET 응답 6개다. 인증값을 전달하지 않는다. 원문과 댓글이 포함되므로 fixture는 저장소 밖의 비공개 경로에 보관한다. 캡처 시각과 SHA-256을 기록하고, A/B가 같은 fixture를 읽게 한다. 실행마다 다시 캡처하면 서로 다른 데이터가 되므로 비교가 끝날 때까지 고정한다.

각 checkout의 `frontend/`에서 다음처럼 서버를 실행한다. 기준/후보는 서로 다른 port를 사용한다. preload는 측정 프로세스에만 주입하며 제품 코드에서 import하지 않는다.

```sh
COMMENT_PERF_FIXTURE="$RILOG_PERF_OUTPUT/fixture/fixture.json" \
NODE_OPTIONS="--import=$RILOG_PERF_HARNESS/comment-server-preload.mjs" \
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3420
```

## 측정과 분석

```sh
node test-harness/performance/measure-comment-panel.mjs \
  --a=http://127.0.0.1:3420 --b=http://127.0.0.1:3421 \
  --fixture="$RILOG_PERF_OUTPUT/fixture/fixture.json" \
  --output="$RILOG_PERF_OUTPUT/final-1440-4x" \
  --revision-a=BASE_SHA --revision-b=CANDIDATE_PATCH_SHA \
  --width=1440 --cpu=4 --blocks=10 --warmup=2
node test-harness/performance/summarize-comment-panel.mjs \
  "$RILOG_PERF_OUTPUT/final-1440-4x/results.json" \
  "$RILOG_PERF_OUTPUT/final-1440-4x/summary.json"
node --test test-harness/performance/summarize-comment-panel.test.mjs
```

1440/1280px와 CPU 1/4배의 조합을 순서대로 실행한다. 측정 중 다른 build/test를 실행하지 않는다.

조건별 ABBA 10블록으로 각 버전을 20회 측정한다. 열기 700ms, 닫기 700ms, 추가 관찰 700ms를 같은 방법으로 수집한다. DOM `click()`을 사용하고, 계측 중 locator 탐색·snapshot·geometry 조회는 하지 않는다. 실제 마우스·키보드·focus·스크롤 동작은 별도 E2E로 검증한다.

주 지표는 trace marker 구간에 겹치는 renderer main thread의 `Layout`/`UpdateLayoutTree` 구간 합집합이다. 중첩 구간을 중복 합산하지 않는다. `longtask`는 PerformanceObserver 기록으로 센다. 프레임 간격은 rAF 관측값이며 compositor FPS나 INP가 아니다. 20회의 p95는 참고값이다. bootstrap은 10,000회·seed872로 고정하고 ABBA 블록 단위로 재표본화한다.

`--css-b=FILE`은 CSS 원인 분리 탐색 실험용이다. B에만 style을 주입하고 해당 파일 hash를 결과에 남긴다. 최종 측정은 CSS 주입 없이 실제 build를 비교한다.

trace는 gzip으로 저장하고 URL query/fragment와 인증·cookie·header 필드를 제거한다. `results.json`에 집계값·raw trace 파일명·hash를 저장한다. 보고서에는 fixture/build/source 식별자와 측정 실패·제외 이유도 남긴다. 큰 trace는 저장소 밖에 archive하고 hash와 보관 위치를 보고서 manifest에서 찾을 수 있게 한다.
