# ADR 0003: Sentry 공통 문맥과 개인정보 전송 경계

- 상태: 적용
- 관련 이슈: #613
- 영향: frontend. BE 요청·응답 계약 변경 없음.

## 배경

#612의 API 오류 필터는 일반 Error와 captureMessage, 성능 추적 이벤트에 적용되지 않았다. 오류 메시지, SDK request/breadcrumb/extra, URL과 파일 첨부에 사용자 입력이 포함될 수 있다. `sendDefaultPii: false`만으로 이 항목을 모두 차단할 수 없다.

## 결정

`initialize-sentry.ts`가 client/server/edge에 동일한 최종 필터를 등록한다. API 수집 판단과 중복 억제는 기존 reporter가 담당하고, `sentry-privacy.ts`는 허용한 필드만 골라 새 이벤트를 만든다. 필터 실패 시 오류·transaction은 폐기하며 원문을 대신 전송하지 않는다. span 필터는 SDK 계약상 null 대신 내용 없는 span을 반환한다. 초기화·capture 실패도 앱으로 전파하지 않는다.

- 공통 태그: `environment`, `release`, `feature`, `operation`, `route`, `browser`, `device`.
- release는 SDK의 빌드 릴리즈 값을 재사용한다. 릴리즈가 주입되지 않은 개발 실행은 `unversioned`로 표시한다. 배포에서는 실제 릴리즈 주입과 소스맵 업로드를 함께 확인한다.
- operation은 #612 계약을 재사용한다. 일반 오류는 `unhandled`, feature는 알려진 화면 경로에서 결정하고 없으면 `app`이다.
- URL은 현재 App Router의 고정 경로 또는 `/[slug]`, `/[slug]/settings`, `/[slug]/posts/[postId]`, `/[slug]/posts/[postId]/markdown`만 남긴다. `/write`의 draft ID를 포함한 모든 query와 fragment는 버린다. 알 수 없는 경로는 `unknown`이다.
- 브라우저는 UA를 로컬에서 종류·major version으로 분류하며 원문 UA는 보내지 않는다. device는 desktop/mobile/tablet, 정보가 없으면 unknown이다. 서버 요청에 UA가 없으면 추측하지 않는다.
- API 추가 태그는 `api_error_code`, `httpStatus`, UUID 형식의 `request_id`다. 실제 값이 없으면 생략한다. 코드표에 없는 코드는 수집하되 원문 대신 `UNKNOWN_ERROR_CODE`를 기록한다. 공개 코드인지 확인할 수 없는 응답 문자열에 닉네임 등이 섞일 가능성을 막기 위함이다. #612의 수집 여부 판단은 바꾸지 않는다.
- 내부 변환의 `errorCode`/`error_code`/`status` 별칭은 최종 전송에서 제거한다. 정규화 분류 `error_type`, `error_kind`는 정해진 값만 유지한다.
- 일반 오류 메시지·captureMessage 원문·연결된 cause는 보내지 않는다. 오류 종류와 배포 스택의 파일·라인·컬럼, 검증한 source-map debug ID를 남긴다. API 제목은 허용한 태그로 다시 만든다.
- 배포 스택은 Next 정적 chunk와 서버 빌드 경로만 보존한다. 호스트·로컬 절대 경로·query·fragment·소스 문맥·지역변수·임의 함수명은 제거한다. 프레임과 debug metadata는 동일한 `app:///_next/...` 경로로 변환한다.
- request/response body, 모든 request headers, user, extra, 임의 contexts/tags/fingerprint, 원문 breadcrumb, 파일 첨부를 제거한다. 429 breadcrumb는 고정 문구와 HTTP method·retry_count만 남긴다.
- transaction 이름과 span description도 경로 템플릿으로 변환한다. span data/links, transaction 추가 속성은 제거하고 추적 ID와 시간만 유지한다. Sentry Logs는 비활성화한다. Replay는 추가하지 않는다.

## 결과와 한계

민감정보 유출 가능성을 줄이는 대신 자유 형식 메시지, 제3자·개발 소스 프레임과 상세 성능 속성은 잃는다. 배포 소스맵과 request_id로 조사한다. 안전한 추가 정보가 필요하면 필드별 허용 계약과 테스트를 먼저 추가한다. 새 App Router 경로를 추가할 때 경로 분류도 갱신한다.

이 결정은 Sentry로 보내는 프론트엔드 이벤트에 적용하며 PostHog나 BE 로그 정책을 변경하지 않는다. 운영 Sentry의 보관·서버 측 IP 설정과 실제 소스맵 복원은 배포 환경에서 별도로 확인한다.

## 검증 계약

민감값을 섞은 일반 오류·API 오류·메시지·transaction·span을 검증한다. client/server/edge 초기화에 같은 필터가 연결되고, 첨부파일과 필터 실패도 차단되는지 확인한다. 실제 설치된 Sentry SDK와 메모리 transport로 최종 envelope를 검사하여 정책 기반 수집·중복 억제·배포 스택 보존이 함께 유지되는지 확인한다.
