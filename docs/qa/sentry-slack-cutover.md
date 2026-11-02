# Sentry Slack 전환 점검

관련 이슈 #815, ADR 0022. 이 문서는 실행 계획이며 아래 운영 작업은 아직 실행하지 않았다.

## 1. 계정 지원과 준비 조건

- Rilog Sentry 계정에서 현재 플랜/권한으로 internal integration의 issue alert action을 사용할 수 있는지 확인한다. 불가능하면 legacy를 유지하고 제약과 대안을 결정한다. 유료 플랜 전환을 자동 수행하지 않는다.
- integration 생성은 권한/credential을 만드는 별도 작업이다. 필요한 프로젝트·issue alert 범위만 검토하고 사용자 승인 후 수행한다. source map 업로드 token을 다른 목적으로 재사용하지 않는다. 구현은 Client Secret만 필요하며 integration 생성 시 나타나는 다른 API token을 서버에 복사하지 않는다.
- 기존 Slack credential은 서버에만 둔다. 새 credential과 payload를 문서·로그·PR에 붙이지 않는다.

## 2. 전용 환경·테스트 채널 검증

먼저 격리된 수신 서버, 테스트 프로젝트와 테스트 Slack 채널에서 검증한다. 실제 운영 event를 새로 만들지 않는다.

```dotenv
SENTRY_SLACK_MODE=webhook
SENTRY_WEBHOOK_CLIENT_SECRET=<Sentry integration Client Secret, 32자 이상>
SENTRY_WEBHOOK_PROJECT_ID=<허용할 테스트 프로젝트 ID>
SENTRY_WEBHOOK_ORG=<해당 조직 slug>
SENTRY_WEBHOOK_ENVIRONMENT=smoke
SENTRY_SLACK_STATE_DIR=<배포 디렉터리 밖의 영속적인 절대 경로>
SENTRY_SLACK_BOT_TOKEN=<기존 승인 범위 내 테스트 채널용 설정>
SENTRY_SLACK_CHANNEL_ID=<테스트 채널 ID>
```

Incoming Webhook을 쓰면 bot/channel 대신 테스트 채널의 SENTRY_SLACK_WEBHOOK_URL을 사용한다. 실제 credential을 이 문서에 입력하지 않는다. 환경값은 placeholder다.

Sentry action 대상은 수신 서버의 /api/observability/sentry-webhook이다. 서명된 event_alert를 발생시켜 Slack의 실제 event 링크·환경·release와 마스킹을 확인한다. 같은 webhook의 재전송, 프로세스 재시작 뒤 재전송, 동시 요청, 다른 프로젝트/환경, 잘못된 서명, Slack 장애, 쓰기 불가능한 상태 경로를 확인한다. 서명 없는 summary 또는 동일 Origin 요청은 새 모드에서 410이어야 한다. mock 테스트 성공만으로 실제 수신 성공을 판정하지 않는다.

## 3. 운영 전환

1. Sentry 규칙의 환경 prod, error/fatal, 대상 프로젝트, 알림 범위/빈도를 기존 동작과 비교한다. 과거 high-priority 규칙을 그대로 재사용하면 범위가 좁아질 수 있다. 테스트와 최초 사용자 로딩·저장 실패를 혼동하지 않는다.
2. 운영 Client Secret, 프로젝트 ID, 조직, 기존 승인된 Slack 채널, 상태 경로 권한/영속성을 확인한다. SENTRY_WEBHOOK_ENVIRONMENT는 prod로 명시한다. state 경로를 /tmp나 교체되는 build 디렉터리에 두지 않는다.
3. 새 수신 경로와 action을 준비한 뒤 SENTRY_SLACK_MODE=webhook으로 전환하고 기존 직접 전송이 차단되는지 확인한다. 다른 공식 Slack action과의 중복도 점검한다. 변경 순서에 따라 잠깐의 중복/공백이 가능하므로 조용한 시간에 담당자가 전환 결과를 확인한다.
4. 실제 기존 운영 이벤트의 후속 alert와 링크를 확인한다. 의도적 운영 장애나 임의 테스트 이벤트를 만들지 않는다.
5. 후속 build에 NEXT_PUBLIC_SENTRY_SLACK_MODE=webhook을 넣어 browser/edge의 불필요한 직접 요청을 제거한다. 오래된 bundle도 서버의 mode가 차단한다.
6. 전환 검증 후 별도 정리 PR에서 legacy 코드 완전 삭제 여부를 결정한다. 이 단계 전에 기존 경로를 삭제하지 않는다.

## 장애와 rollback

- 새 수신 경로의 503/410/401 응답과 Slack 전달 상태를 감시한다. 성공한 delivered marker는 지우지 않는다.
- 오래 남은 pending은 프로세스 종료 중 불확실한 Slack 결과일 수 있다. event ID로 실제 Slack/Sentry를 확인한 뒤 해당 claim만 처리한다. 디렉터리 전체를 초기화하거나 자동 만료하지 않는다.
- webhook은 최근 breadcrumb도 하나의 메시지에 담는다. Slack 처리 후 timeout에서는 중복이 가능하다. 완료 marker 저장 실패도 알림 상태를 확인한다. 이 구현은 영속 queue나 여러 호스트 사이의 전역 저장소가 아니다.
- rollback은 새 Sentry action 중지와 legacy 복원으로 진행한다. NEXT_PUBLIC 모드를 이미 바꿨으면 legacy callback 복원을 위해 rebuild/배포도 필요하다. credential·state 데이터 삭제는 rollback의 기본 절차가 아니다.

## 현재 검증 범위

로컬에서는 실제 crypto, 임시 파일시스템, HTTP handler, 기존 Slack 포맷/마스킹을 연결하고 Slack fetch만 대체해 검증한다. 계정별 플랜/권한, 실제 integration 생성, secret 설정, 테스트 채널 송신, 운영 전환은 별도 확인이 필요하다.
