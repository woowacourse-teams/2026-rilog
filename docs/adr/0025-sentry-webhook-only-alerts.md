# ADR 0025: Sentry Slack 직접 전송 제거

- 상태: 승인 — #815의 서명 웹훅 운영 전환 검증 이후 정리
- 대체: ADR 0007의 직접 전송, ADR 0022의 전환 기간 legacy 분기
- 영향: frontend 오류 관측과 Slack 전달. 제품 API·인증·오류 수집 정책은 유지한다.

## 배경

#857과 #858에서 서버 진단 정보와 서명 웹훅 설정을 반영했다. 2026-11-02 운영 전환 후 새 release의 자연 발생 이벤트 3개가 Sentry 알림 이력과 Slack에서 같은 event ID로 확인됐다. 테스트 프로젝트에서는 실제 Sentry 발신, 서명 검증, Slack 전달, 잘못된 서명 거절, 재전송·수신 서버 재시작 뒤 중복 억제를 검증했다. 이 기록은 과거 전환의 증거이며 이후 배포의 정상 동작을 자동 보증하지 않는다.

## 결정

SDK beforeSend의 Slack callback과 브라우저·Node·Edge 직접 전달을 제거한다. SDK의 오류·원본 스택·API 진단·PostHog replay 수집과 최종 개인정보 정제는 유지한다. Slack 전달은 `/api/observability/sentry-webhook`에서 검증한 event_alert만 사용한다.

서버 `SENTRY_SLACK_MODE=webhook`만 알림을 허용한다. off, 미설정, legacy 또는 잘못된 값은 off로 처리한다. `NEXT_PUBLIC_SENTRY_SLACK_MODE`는 사용하지 않는다. 오래된 설정에 해당 키가 남아 있어도 동작에 영향이 없다. SDK 수집과 webhook 알림 중지는 독립적이다.

기존 `/api/observability/sentry-slack` POST는 항상 410을 반환하는 호환 응답만 남긴다. 요청 body를 읽거나 Slack으로 전달하지 않는다. 오래 열린 브라우저 bundle이 재요청해도 직접 알림은 복구되지 않는다.

legacy 전용 공개 요약 parser, IP별 rate limit, 프로세스 메모리의 5분 중복 억제, breadcrumb 스레드 댓글과 저장 미확인 링크를 제거한다. 검증한 실제 이벤트 링크와 breadcrumb 요약은 한 메시지에 담고, bot token 방식과 Slack Incoming Webhook 방식은 모두 유지한다.

## 유지할 검증 경계

- 원문 body의 HMAC, resource/action, 대상 프로젝트·환경·error/fatal 검증
- 조직 및 issue/event ID로 구성한 실제 이벤트 링크와 개인정보 정제
- 영속 pending/delivered marker, 동시 claim, 실패 재시도와 중복 억제
- Slack 429/5xx retry와 전달·저장 실패의 503 응답
- Slack 전달 실패와 무관한 Sentry SDK 수집 및 사용자 오류 복구

알림 빈도는 Sentry 규칙에서 결정한다. Slack 처리 후 timeout 또는 delivered 저장 전 종료의 중복 가능성은 남으며 exactly-once는 보증하지 않는다. 여러 호스트의 전역 중복 억제는 별도 저장소가 필요하다.

## 중지와 rollback

알림을 중지할 때는 서버 mode를 off로 배포하거나 해당 Sentry action을 비활성화한다. delivered/pending 파일과 인증값을 일괄 삭제하지 않는다. 이 변경 이후 legacy 설정만으로 직접 전송을 복구할 수 없다. 필요하면 이전 코드로 명시적으로 되돌리고 해당 코드의 설정·재빌드·배포 절차를 따라야 한다. 이 정리 PR 자체에서는 운영 설정 변경·병합·배포를 수행하지 않는다.
