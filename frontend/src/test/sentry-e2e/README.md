# Sentry 테스트와 격리된 실제 전송 검증

일반 network 실패 검증은 가짜 DSN과 mock transport를 사용한다. 실제 ingest/source map smoke는 운영과 다른 Sentry 프로젝트를 명시해야 한다. 운영 프로젝트 ID 4512133995429888 또는 slug rilog-frontend-nextjs는 거부한다.

## 테스트 프로젝트 설정

로컬 frontend/.env 또는 수동 workflow의 전용 secret/variable에 다음 값을 설정한다. 실제 값을 문서·로그·PR에 붙이지 않는다.

```dotenv
SENTRY_SMOKE_DSN=<테스트 프로젝트 DSN>
SENTRY_SMOKE_PROJECT_ID=<DSN의 테스트 프로젝트 ID>
SENTRY_SMOKE_PROJECT_SLUG=<테스트 프로젝트 slug>
SENTRY_SMOKE_ORG=<테스트 조직 slug>
SENTRY_AUTH_TOKEN=<테스트 프로젝트 source map 업로드용 token>
```

일반 NEXT_PUBLIC_SENTRY_DSN은 fallback으로 사용하지 않는다. DSN과 명시적 project ID가 일치해야 한다. source map 업로드도 같은 smoke org/project를 사용한다. smoke target이 없으면 fixture 생성·build·실제 전송 전에 실패한다. 일반 build의 기존 조직명은 이 변경에서 추측해 바꾸지 않는다.

## 실제 source map smoke

```sh
pnpm test:sentry:post-503:prod
```

이 명령은 fixture 생성, 준비, production build/source map 업로드, localhost의 발행 503 검증을 실행한다. NODE_ENV와 관계없이 environment는 smoke이며 source map release는 sourcemap-smoke-<sha>-<timestamp>다. Sentry 화면에서 출력한 event ID, release, request_id=sentry-smoke-post-503, 소스 복원을 확인한다. 명령 성공만으로 Sentry의 최종 저장·복원 확인을 대체하지 않는다.

실제 전송 없이 Playwright 전송 요청을 검증하려면 같은 테스트 대상 설정과 SENTRY_SMOKE_DRY_RUN=true를 사용해 pnpm test:sentry:post-503 또는 pnpm test:sentry:feed-503을 실행한다. source map runner 자체는 dry run을 허용하지 않는다. 앱을 미리 실행한 경우 build에도 같은 설정을 적용해야 한다.

## PostHog replay 검증

```dotenv
SENTRY_SMOKE_POSTHOG_PROJECT_TOKEN=<테스트 PostHog 프로젝트 token>
SENTRY_SMOKE_POSTHOG_HOST=<테스트 PostHog host>
```

위 전용 설정 후 pnpm test:sentry:post-503:replay를 실행한다. 일반 PostHog 설정은 상속하지 않는다. 실제 테스트 프로젝트인지 실행자가 먼저 확인한다. replay snapshot과 Sentry replay URL을 검사하며 운영 Slack 알림은 검사하지 않는다.

## Slack 격리

runner와 Playwright webServer는 SENTRY_SLACK_BOT_TOKEN, SENTRY_SLACK_CHANNEL_ID, SENTRY_SLACK_WEBHOOK_URL을 빈 값으로 덮어쓴다. 앱의 smoke 환경도 운영 Slack callback과 서버 전달을 차단한다. 발행 E2E는 공개 Slack summary 요청이 발생하지 않는지 확인한다. Slack 포맷·중복·전송 실패 계약은 sentry-slack-delivery.unit.test.ts와 sentry-slack-summary.unit.test.ts에서 mock으로 검증한다. 운영 알림 경로 전환은 #815에서 별도 검증한다.

## 수동 workflow

GitHub Actions의 Sentry Isolated Smoke는 자동 push/PR에서 실행하지 않는다. 저장소에 아래 전용 값을 준비한 뒤 수동 실행한다. 이 PR은 secret·프로젝트·credential을 생성하지 않는다.

- secrets: SENTRY_SMOKE_DSN, SENTRY_SMOKE_AUTH_TOKEN
- variables: SENTRY_SMOKE_PROJECT_ID, SENTRY_SMOKE_PROJECT_SLUG, SENTRY_SMOKE_ORG

workflow는 ENV_PROD_FE를 읽지 않는다. 설정 누락 시 실패하며 artifact에 환경 파일을 저장하지 않는다. 실제 ingest는 전용 프로젝트 준비 뒤에만 실행한다.
