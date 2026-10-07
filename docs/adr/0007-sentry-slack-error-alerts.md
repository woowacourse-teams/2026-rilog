# ADR 0007: Sentry 전송 전 오류의 Slack 알림

- 상태: 적용 예정
- 영향: frontend 오류 관측과 운영 알림. 공개 제품 API 계약은 변경하지 않는다.
- 기반: `fe/feature/#693-sentry에-오류-전후-흐름과-사용자-영향-기록`

## 배경

Sentry Developer 플랜에서는 Slack Integration 알림을 계속 사용할 수 없다. 브라우저, Node 및 Edge 오류는 기존 Sentry SDK가 수집하며 `beforeSend`에서 최종 전송 필터를 통과한다.

## 결정

오류 `beforeSend`에서 기존 수집 판단과 개인정보 필터를 통과한 `prod` 오류만 Slack 알림 후보로 삼는다. 전송 전 이벤트이므로 Sentry 저장이나 최종 이슈 그룹화 성공을 의미하지 않는다. 알림에는 이벤트 전체를 복사하지 않고 오류 종류, 최대 180자의 정제된 제목, 안전한 경로, `operation`·`http_status`·`error_code` 등 허용한 태그, 환경·릴리즈, event ID, 최근 자동 breadcrumb 세 건만 사용한다. 제목의 Rilog API URL은 실제 origin과 path를 유지하고 query·fragment·인증정보는 버린다. 외부 URL은 숨긴다. HTTP breadcrumb는 category·method·URL·status, navigation은 from·to, UI 동작은 category·태그명·selector와 최대 열 개의 태그 속성만 전달한다. 알려진 인증값·민감한 query·이메일·입력값은 제거한다. 이벤트의 request, user와 stack은 Slack으로 전송하지 않는다.

기본 알림은 오류 종류, 경로, 제목, 태그를 한 코드 블록의 줄별 항목으로, event ID를 본문에 표시한다. `chat:write` 권한의 Bot Token과 채널 ID가 있으면 `chat.postMessage`의 응답 `ts`를 사용해 최근 breadcrumbs 세 건을 각각 부모 메시지의 스레드 댓글로 게시한다. 채널당 메시지 제한을 고려해 댓글 전송 간격을 둔다. Bot 설정 전에는 기존 Incoming Webhook으로 기본 알림만 보낸다. 웹훅 응답은 부모 메시지의 `ts`를 제공하지 않아 댓글을 달 수 없다.

PostHog가 현재 브라우저 세션을 녹화 중이면 오류 발생 30초 전으로 이동하는 session replay URL을 Sentry의 `PostHog Recording URL` 태그와 context에 추가하고 Slack 기본 알림에도 링크로 표시한다. PostHog 프로젝트에서 session replay가 비활성화됐거나 샘플링에서 제외된 세션, 브라우저 세션이 없는 Node·Edge 오류에는 링크를 추가하지 않는다. PostHog 오류 추적 이벤트는 별도로 보내지 않아 기존 Sentry 보고와 중복되지 않는다.

브라우저와 Edge는 자체 `/api/observability/sentry-slack` 경로로 요약을 보내고, Node는 같은 전송 함수를 직접 호출한다. Slack 인증값은 서버 전용 환경변수에만 둔다. 공개 수신 경로는 Origin, JSON 형식, 크기, 필드 허용 목록을 검증한다. Origin은 진짜 SDK 요청임을 증명하지 못하므로 프로세스 단위 IP/전체 발송량 제한과 동일 오류 5분 억제도 둔다. 현재 운영 PM2는 단일 프로세스이며, 인스턴스를 늘리면 공유 저장소로 제한·중복 상태를 옮겨야 한다.

Slack 실패는 Sentry 전송을 방해하지 않고, 전송 결과를 다시 Sentry 오류로 보고하지 않는다. 429/5xx는 한 번 재시도한다. 브라우저·Edge의 비동기 요청은 종료 시 유실될 수 있으며, Node 프로세스 재시작 시 중복 상태도 초기화된다. 완전한 1회 전달이 필요해지면 별도 영속 대기열을 도입한다.

## 운영과 검증

GitHub Actions의 `SENTRY_SLACK_WEBHOOK_URL` 또는 `SENTRY_SLACK_BOT_TOKEN`·`SENTRY_SLACK_CHANNEL_ID` secret을 배포 job에서만 읽어 EC2의 권한 600인 `.env.production.local`에 저장한다. Bot 방식은 Slack 앱의 `chat:write` 권한과 대상 채널 멤버십이 필요하다. 이 값들은 브라우저 환경변수나 빌드 artifact에 넣지 않는다. 배포 후 브라우저·Node·Edge의 대표 오류를 테스트 채널로 보내 Sentry 수집과 Slack 기본 메시지·스레드 댓글을 각각 확인한다. 동일 오류 반복, Slack 장애, URL·이메일·토큰이 섞인 breadcrumb의 비노출을 검증한다. 요약의 개인정보 허용 범위를 넓힐 때 이 ADR과 테스트를 함께 갱신한다.
