# ADR 0020: Sentry 배포 환경과 실행 모드 분리

- 상태: 제안 — #813
- 영향: frontend browser/Node/Edge 수집과 배포 설정. API 계약 변경 없음.
- 보완: ADR 0004, ADR 0007

## 배경

NODE_ENV=production만으로 prod 라벨과 SDK 활성화를 결정하면 localhost의 production smoke도 운영 오류로 저장된다. 실제 운영 프로젝트에서 localhost·테스트 API·sourcemap-smoke release가 prod로 수집됐다. 명시적 비활성화도 production 모드에서 무시됐다.

## 결정

NEXT_PUBLIC_SENTRY_ENVIRONMENT를 prod, preview, local, smoke 중 하나로 명시한다. NODE_ENV는 수집 환경을 결정하지 않는다. 기존 검색·이력과의 호환성을 위해 운영 이름 prod를 유지한다. 환경 미지정·잘못된 환경은 local로 표시하되 수집하지 않는다. DSN이 없거나 NEXT_PUBLIC_SENTRY_ENABLED=false이면 모든 환경에서 비활성화한다. prod는 활성화 기본값을 유지하고, 다른 환경은 true로 명시해야 수집한다.

prod는 NEXT_PUBLIC_SITE_URL의 origin이 https://www.rilog.kr일 때만 활성화한다. 브라우저는 실제 origin도 검사한다. 이 검사는 배포 설정 오류를 막는 보조 장치이며 발신자 인증 수단이 아니다. Node/Edge는 실행 위치를 추측하지 않고 배포 설정을 신뢰한다. runtime 태그는 browser/node/edge로 구분한다.

운영 push workflow는 prod를 build에 주입하고 배포 PM2도 같은 환경을 지정한다. 운영 source map 업로드 전 설정 검증을 실행한다. PR·수동 build preparation은 preview로 구분하고 수집을 끈다. 기존 secret에 환경을 추가하지 않아도 workflow와 PM2가 환경을 전달하지만, 별도 배포 경로는 같은 설정을 명시해야 한다. NEXT_PUBLIC 값은 브라우저 build 시 고정되므로 수집 설정 변경에는 rebuild가 필요하다. 서버의 비활성화만으로 이미 제공한 브라우저 bundle을 중지할 수 없다.

Slack 직접 전송은 후속 #815에서 전환한다. 이 단계에서는 활성화된 prod 이벤트만 기존 callback을 실행한다. smoke 전용 DSN·Slack 격리는 #814에서 별도로 검증한다. 실제 운영 Sentry 필터·이벤트는 이 PR에서 변경하지 않는다.

## 검증과 전환

환경·활성화·사이트 origin 조합의 단위 테스트와 실제 SDK 초기화 연결을 확인한다. production 모드의 smoke가 운영 Slack callback을 실행하지 않는지 확인한다. 배포 전 prod 환경 주입과 명시적 disable을 확인하고, 이전 artifact로 롤백할 때 구형 NODE_ENV 정책이 복원된다는 점을 기록한다.
