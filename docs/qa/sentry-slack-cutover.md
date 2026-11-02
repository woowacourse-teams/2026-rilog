# Sentry 서명 Slack 알림 운영 점검

관련 이슈 #815, [ADR 0025](../adr/0025-sentry-webhook-only-alerts.md). SDK 직접 전송은 제거됐고, 기존 summary POST는 항상 410을 반환한다. 이 정리 변경은 운영 설정을 자동 변경하지 않는다.

## 운영 설정

Repository Secret `ENV_PROD_FE`의 기존 API·ISR·분석·Sentry 수집 설정을 보존한다. `ENV_SENTRY_WEBHOOK_FE`에 아래 웹훅 항목만 넣으면 운영 FE workflow가 기존 값 다음에 병합해 빌드·서버에 적용한다. 인증값에 NEXT_PUBLIC_ 접두사를 붙이지 않는다.

```dotenv
SENTRY_SLACK_MODE=webhook
SENTRY_WEBHOOK_CLIENT_SECRET=<integration Client Secret, 32자 이상>
SENTRY_WEBHOOK_PROJECT_ID=4512133995429888
SENTRY_WEBHOOK_ORG=rilog-frontend
SENTRY_WEBHOOK_ENVIRONMENT=prod
SENTRY_SLACK_STATE_DIR=/home/ubuntu/rilog-observability/sentry-slack
```

- SDK 수집의 `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_ENABLED`, DSN 및 소스맵 업로드 토큰은 기존 설정을 유지한다.
- 기존 `SENTRY_SLACK_BOT_TOKEN`·`SENTRY_SLACK_CHANNEL_ID` 또는 `SENTRY_SLACK_WEBHOOK_URL`은 서버에서 계속 필요하다. Bot에는 chat:write와 대상 채널 멤버십이 필요하다.
- Client Secret은 DSN·소스맵 토큰과 다른 값이다. integration 생성 때 한 번 표시되는 값을 보호해 저장한다. 사용 중인 키를 임의로 회전하지 않는다.
- 상태 경로는 예시다. PM2 사용자가 생성·쓰기 가능한 영속 절대 경로로 정하고 디렉터리 700·파일 600을 유지한다. `/tmp`나 교체되는 빌드 폴더를 쓰지 않는다.
- `NEXT_PUBLIC_SENTRY_SLACK_MODE`는 더 이상 사용하지 않는다. 기존 Secret에 남은 값은 무시되며 이 PR 배포를 위해 삭제할 필요는 없다.
- mode 미설정·off·legacy·잘못된 값은 알림을 중지한다. SDK 오류 수집은 별개다.

## Sentry 규칙

운영 integration의 URL은 `https://www.rilog.kr/api/observability/sentry-webhook`이고 Alert Action을 활성화한다. 운영 프로젝트와 prod 환경을 지정한다. 수신 서버는 error/fatal만 전달한다. 계정의 현재 플랜·권한에서 action 사용이 가능한지 확인하고 요금제 변경은 자동 수행하지 않는다.

운영 전환에서 준비한 규칙은 이벤트 캡처와 이슈 생성·회귀 등의 trigger를 사용하며 같은 이슈의 알림은 5분 간격으로 제한한다. high-priority 전환만 감시하는 규칙은 매 이벤트 전달과 범위가 다르다. 원하는 알림 범위·빈도와 다른 Slack action의 중복을 확인한다.

## 격리 검증

테스트 프로젝트·비공개 테스트 채널·수신 서버를 별도로 사용한다. 위 설정에서 프로젝트 ID와 URL, 채널, 상태 경로를 테스트 대상으로 바꾸고 `SENTRY_WEBHOOK_ENVIRONMENT=smoke`로 설정한다. 운영 프로젝트로 테스트 오류나 개인정보 fixture를 보내지 않는다.

1. 실제 Sentry 발신 `event_alert`가 2xx로 처리되고 Sentry와 Slack의 event ID·환경·release·링크가 일치하는지 확인한다.
2. 경로·API 요청 진단·마스킹·PostHog 링크·breadcrumb가 유지되고 한 메시지에 담기는지 확인한다.
3. 같은 서명 요청 재전송과 수신 서버 재시작 뒤에 중복 메시지가 생기지 않는지 확인한다.
4. 잘못된 서명은 401, 다른 프로젝트·환경·warning은 204 무시, 잘못된 payload는 400, 과대 요청은 413인지 확인한다.
5. Slack 실패·쓰기 불가 상태 경로가 503으로 드러나고 이후 재시도가 가능한지 확인한다. 성공 marker를 지우지 않는다.
6. 기존 summary POST는 mode·Origin·body에 관계없이 410이어야 한다. 테스트 이후 임시 alert·수신 서버·터널을 정리한다.

`SENTRY_SMOKE_AUTH_TOKEN`, `SENTRY_SMOKE_DSN`과 `SENTRY_SMOKE_*` Variables는 소스맵·수집 smoke workflow용이며 webhook Client Secret을 대신하지 않는다.

## 배포 후 확인과 실패 복구

- 자연 발생한 운영 이벤트의 Sentry alert 실행 이력과 Slack event ID를 대조한다. 수신 endpoint의 401/503과 Slack 상태를 확인한다.
- 알림 중지가 필요하면 Sentry action을 비활성화하거나 서버 mode를 off로 배포한다. 인증값과 영속 상태를 일괄 삭제하지 않는다.
- 오래 남은 pending은 Slack 전달 결과가 불확실한 상태일 수 있다. 해당 event ID의 실제 Slack 수신을 확인하고 claim 하나만 복구한다. 전체 디렉터리 초기화나 자동 만료를 하지 않는다.
- Slack 처리 후 timeout, delivered 저장 전 종료에서는 중복 가능성이 남는다. 이 구현은 영속 queue나 다중 호스트 전역 저장소가 아니다.
- legacy 코드가 제거된 이후에는 mode를 legacy로 바꿔도 복구되지 않는다. 필요하면 이전 코드로 명시적으로 되돌리고 그 코드에 맞춰 재빌드·배포한다.

## 기존 운영 전환 증거

2026-11-02 #857·#858 배포 후 서명 없는 요청 401, 기존 summary 410, 기존 운영 이벤트의 서명 재전송·Slack 수신을 확인했다. 이후 새 release의 자연 발생 timeout 2개·스트림 종료 1개가 운영 규칙 실행 이력과 Slack에서 같은 event ID로 확인됐다. 이 증거는 legacy 삭제 변경의 배포 후 검증을 대신하지 않는다.
