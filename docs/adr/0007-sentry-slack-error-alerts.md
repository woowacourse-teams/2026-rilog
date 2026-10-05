# ADR 0007: Sentry 전송 전 오류의 Slack 알림

- 상태: 적용 예정
- 영향: frontend 오류 관측과 운영 알림. 공개 제품 API 계약은 변경하지 않는다.
- 기반: `fe/feature/#693-sentry에-오류-전후-흐름과-사용자-영향-기록`

## 배경

Sentry Developer 플랜에서는 Slack Integration 알림을 계속 사용할 수 없다. 브라우저, Node 및 Edge 오류는 기존 Sentry SDK가 수집하며 `beforeSend`에서 최종 전송 필터를 통과한다.

## 결정

오류 `beforeSend`에서 기존 수집 판단과 개인정보 필터를 통과한 `prod` 오류만 Slack 알림 후보로 삼는다. 전송 전 이벤트이므로 Sentry 저장이나 최종 이슈 그룹화 성공을 의미하지 않는다. 알림에는 이벤트 전체를 복사하지 않고 오류 종류, 최대 180자의 정제된 제목, `operation`·`http_status`·`error_code` 등 허용한 태그, 환경·릴리즈, event ID, 최근 자동 breadcrumb 세 건의 요약만 사용한다. breadcrumb의 원본 `data`, request, user, stack, console 출력과 UI 입력·이동 URL은 Slack으로 전송하지 않는다. HTTP breadcrumb의 method, 허용된 API 주소의 정적 resource 경로, status와 UI 요소 종류 등 진단 값은 유지한다.

브라우저와 Edge는 자체 `/api/observability/sentry-slack` 경로로 요약을 보내고, Node는 같은 전송 함수를 직접 호출한다. Slack Incoming Webhook URL은 서버의 `SENTRY_SLACK_WEBHOOK_URL`에만 둔다. 공개 수신 경로는 Origin, JSON 형식, 크기, 필드 허용 목록을 검증한다. Origin은 진짜 SDK 요청임을 증명하지 못하므로 프로세스 단위 IP/전체 발송량 제한과 동일 오류 5분 억제도 둔다. 현재 운영 PM2는 단일 프로세스이며, 인스턴스를 늘리면 공유 저장소로 제한·중복 상태를 옮겨야 한다.

Slack 실패는 Sentry 전송을 방해하지 않고, 전송 결과를 다시 Sentry 오류로 보고하지 않는다. 429/5xx는 한 번 재시도한다. 브라우저·Edge의 비동기 요청은 종료 시 유실될 수 있으며, Node 프로세스 재시작 시 중복 상태도 초기화된다. 완전한 1회 전달이 필요해지면 별도 영속 대기열을 도입한다.

## 운영과 검증

GitHub Actions의 `SENTRY_SLACK_WEBHOOK_URL` secret을 배포 job에서만 읽어 EC2의 권한 600인 `.env.production.local`에 저장한다. 이 값은 브라우저 환경변수나 빌드 artifact에 넣지 않는다. 배포 후 브라우저·Node·Edge의 대표 오류를 테스트 채널로 보내 Sentry 수집과 Slack 요약을 각각 확인한다. 동일 오류 반복, Slack 장애, URL·이메일·토큰이 섞인 breadcrumb의 비노출을 검증한다. 요약의 개인정보 허용 범위를 넓힐 때 이 ADR과 테스트를 함께 갱신한다.
