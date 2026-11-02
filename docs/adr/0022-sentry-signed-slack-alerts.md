# ADR 0022: 서명된 Sentry alert를 통한 Slack 전환 경로

- 상태: 제안 — #815. 코드 준비이며 운영 전환은 미실행.
- 선행: #813, #814
- 보완: ADR 0007. 기존 직접 전송은 전환 완료 전까지 legacy 모드로 유지한다.
- 영향: frontend 오류 관측의 서버 수신 경계와 Slack 전달. 제품 API 변경 없음.

## 근거와 지원 확인

Sentry 공식 [webhook 문서](https://docs.sentry.io/organization/integrations/integration-platform/webhooks/)는 Client Secret을 사용하는 SHA-256 HMAC과 Sentry-Hook-Signature를 정의한다. [Issue alert 문서](https://docs.sentry.io/organization/integrations/integration-platform/webhooks/issue-alerts/)의 event_alert/triggered payload에는 event_id, project, issue_id, tags, exception 등의 이벤트 정보가 포함된다.

ADR 0007에는 Developer 플랜의 Slack 제약이 기록되어 있다. 공식 문서는 signed issue alert 기능을 설명하지만, 현재 Rilog 계정의 플랜·권한에서 사용 가능한지는 이 코드 변경이 확인하지 못했다. 사용 가능 여부를 검증하거나 요금제 변경을 승인한 것으로 취급하지 않는다. internal integration 생성은 별도 보안 접근을 만드는 작업이며 이 PR은 integration·Client Secret·API token을 생성하지 않는다.

## 결정

기본 legacy 모드를 유지해 준비되지 않은 새 경로로 자동 전환하지 않는다. legacy 메시지에는 SDK 전송 전이며 Sentry 저장 미확인임을 표시한다. SENTRY_SLACK_MODE=webhook을 명시하면 서버는 직접 전달과 공개 summary API를 차단하고 /api/observability/sentry-webhook만 사용한다. off 또는 잘못된 모드도 legacy로 fallback하지 않는다. NEXT_PUBLIC_SENTRY_SLACK_MODE는 새 브라우저 bundle의 직접 callback을 중단하는 build 설정이다. 서버의 SENTRY_SLACK_MODE가 최종 전달 경계를 통제하므로 오래된 브라우저 bundle의 summary 요청도 전환 후 410으로 차단한다. Sentry SDK 수집은 계속된다. SDK의 enabled 설정과 alert 모드는 별도이며 webhook 알림을 중지하려면 SENTRY_SLACK_MODE=off를 사용한다.

새 경로는 제한된 원문 body에 대해 HMAC을 일정 시간 비교로 검증한다. 파싱한 JSON을 다시 직렬화한 값으로 검증하지 않는다. Origin이나 event ID 형식만으로 발신자를 신뢰하지 않는다. payload/서명/secret은 로그에 출력하지 않는다. SDK의 자동 request 문맥에도 서명이 남지 않도록 Sentry-Hook-Signature를 객체·tuple header 표현 모두에서 제거한다. 서명되지 않은 timestamp header를 재전송 방지의 근거로 사용하지 않는다.

서명 이후에도 명시한 프로젝트 ID, 허용 환경(prod 기본값, 격리 검증용 smoke), error/fatal 수준을 확인한다. prod에 섞인 sourcemap-smoke release는 제외한다. SDK가 결정한 환경은 실제 서버 장애의 증명이 아니며 오류 분류는 #816에서 보완한다. event alert가 아닌 서명된 lifecycle 알림은 발송하지 않는다.

최소 필드만 구성해 기존 Slack 마스킹/요약 경계를 재사용한다. user, request header/body, 원본 stack, 임의 context를 Slack으로 복사하지 않는다. event 링크는 payload URL을 사용하거나 fetch하지 않고 설정된 Sentry 조직과 검증한 issue/event ID로 구성한다. 실제 Sentry alert에 근거한 링크이며 이후 삭제·보존 정책에 따른 현재 조회 가능성까지 보증하지 않는다.

## 중복과 실패

SENTRY_SLACK_STATE_DIR는 배포 artifact 밖의 영속적인 절대 경로여야 한다. 프로젝트/event ID별 배타적인 pending 파일로 동시 전달을 막고 성공한 이벤트는 delivered 파일로 보관한다. 파일 내용은 비우고 디렉터리/파일 권한은 각각 700/600으로 생성한다. 정상 완료한 이벤트는 프로세스 재시작 후에도 다시 보내지 않는다. 동일 오류의 별도 event까지 5분간 숨기지는 않으며 alert 빈도·그룹화는 Sentry 규칙에서 결정한다.

Slack 실패·처리 중·저장소 오류는 성공으로 응답하지 않고 503을 반환한다. 실패한 시도의 claim은 해제해 upstream 재시도를 허용한다. webhook 알림은 최근 breadcrumb를 부모 메시지에 함께 담아 한 번의 Slack 요청으로 전송한다. legacy의 thread 동작은 유지한다. Slack이 처리했으나 응답 전에 timeout되면 재시도에서 중복이 생길 수 있으므로 exactly-once는 보증하지 않는다. 완료 상태 저장 전에 프로세스가 종료되면 pending 파일이 남는다. 이를 자동 만료해 재전송하지 않고 운영자가 Slack 상태를 확인한 뒤 해당 claim만 복구한다. 현재 단일 호스트 PM2 전제이며 다중 호스트는 공유 영속 저장소가 필요하다. marker를 삭제하면 과거 요청을 다시 전달할 수 있어 자동 정리하지 않는다.

## 전환 및 rollback

계정 지원 확인, 최소 권한 integration 설정, 테스트 환경/채널의 실제 서명 전달과 이벤트 링크 확인을 먼저 수행한다. 기존 알림을 끄기 전에 운영 규칙의 환경·오류 수준·범위·빈도와 secret/영속 경로를 점검한다. 서버와 Sentry 규칙을 조정해 중복 또는 공백을 감시하고 이후 브라우저 build 모드를 webhook으로 설정한다. 공식 Slack action이 병존하면 중복 여부도 확인한다.

새 경로 준비가 안 됐으면 legacy를 유지하며 신뢰 한계도 남는다. rollback 시 새 Sentry action을 중지하고 legacy를 복원한다. 브라우저 bundle에서 callback을 제거한 뒤에는 legacy 복원에도 rebuild/배포가 필요하다. 자세한 절차는 [QA 문서](../qa/sentry-slack-cutover.md)를 따른다. 운영 설정 변경·기존 경로 완전 삭제·merge·배포는 이 PR에서 실행하지 않는다.
