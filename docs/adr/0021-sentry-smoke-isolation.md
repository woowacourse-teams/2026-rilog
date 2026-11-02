# ADR 0021: 실제 Sentry smoke의 프로젝트 격리

- 상태: 제안 — #814
- 선행: #813, ADR 0020
- 영향: frontend 테스트 runner, Playwright 설정, source map 업로드 및 수동 CI

## 배경

production build로 실행한 localhost smoke가 운영 DSN과 Slack 설정을 상속해 운영 프로젝트의 prod 이벤트와 섞였다. 환경 라벨 분리만으로 운영 수집량·보존 데이터·알림의 혼입을 막을 수 없어 전송 대상도 격리한다.

## 결정

실제 전송 테스트는 SENTRY_SMOKE_DSN, SENTRY_SMOKE_PROJECT_ID, SENTRY_SMOKE_PROJECT_SLUG, SENTRY_SMOKE_ORG를 명시한다. DSN의 project ID와 선언한 ID가 같아야 한다. 알려진 운영 프로젝트 ID 4512133995429888 및 slug rilog-frontend-nextjs는 거부한다. 운영 프로젝트가 추가·이전되면 이 차단 목록도 함께 갱신한다. 검증 오류는 DSN 원문을 출력하지 않는다.

runner, Next 설정, Playwright 설정이 같은 검증 함수를 사용한다. Next 설정은 운영 runtime에서도 로드되므로 production·build preparation artifact에 해당 helper 파일을 포함한다. 일반 NEXT_PUBLIC_SENTRY_DSN으로 fallback하지 않는다. 업로드에도 smoke org/slug를 전달하고 environment는 smoke를 사용한다. 명시한 org/slug와 ID의 실제 원격 매핑까지 로컬 형식 검사로 증명하지는 못하므로 전용 프로젝트 설정 시 확인한다.

runner와 Playwright webServer는 일반 Slack credential을 빈 값으로 덮어쓴다. smoke 환경 자체도 기존 Slack callback과 서버 전달을 차단한다. 발행 E2E는 Slack 요약 요청이 없음을 확인한다. Slack의 포맷·중복·실패 동작은 mock 단위 테스트로 유지하고 실제 운영 알림 전환은 #815로 분리한다.

PostHog replay smoke도 일반 프로젝트 설정을 상속하지 않고 SENTRY_SMOKE_POSTHOG_PROJECT_TOKEN/HOST를 별도로 요구한다. 실행자는 해당 값이 테스트 프로젝트인지 확인해야 한다. 테스트 프로젝트나 새로운 credential을 이 코드 변경이 생성하지 않는다.

수동 workflow는 전용 secrets/variables만 읽고 ENV_PROD_FE는 읽지 않는다. 일반 push/PR에서는 실제 ingest 검사를 실행하지 않는다. 설정 누락 시 build 전에 실패하며 환경 파일을 artifact에 담지 않는다.

## 검증과 운영 전환

운영 대상·잘못된 DSN·미지정 대상·ID 불일치의 거부와 Slack 상속 차단을 단위 테스트한다. 브라우저 mock transport로 smoke envelope와 중복 보고·민감정보 비노출·Slack 요청 부재를 확인한다. 실제 source map 업로드와 Sentry 저장·복원은 전용 프로젝트를 준비한 뒤 수동 workflow에서 별도로 검증한다. mock 검증 성공은 실제 저장 성공을 보증하지 않는다.
