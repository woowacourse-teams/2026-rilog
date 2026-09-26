# API 오류 보고의 operation별 계약

실행 기준은 [api-error-contracts.ts](../../frontend/src/shared/api/api-error-contracts.ts), 공개 코드와 의미 분류는 [error-codes.ts](../../frontend/src/shared/api/error-codes.ts)다. 목록은 서버에서 발생 가능한 모든 오류가 아니라 **정상 제외 후보**다. 목록에 없는 핵심 작업 실패는 보고하고, 목록에 있어도 5xx이면 보고한다. 아래 근거는 현재 BE 구현을 함께 확인한 것이다. 응답 스펙을 변경하지 않는다.

## 공통 우선순위

1. 사용자 취소 `AbortError`와 오프라인 통신 실패는 제외한다. 오프라인 상태라는 이유로 프로그래밍 오류까지 제외하지 않는다.
2. 최종 5xx, 온라인 통신 실패, BE 계약에 없는 errorCode는 수집한다. FE 호환용 기존 코드 4개도 정상 제외로 취급하지 않는다. 최종 429는 기존 전송 제한을 적용한다.
3. 자사 API의 정상 권한·부재·중복(`authorization`, `not-found`, `conflict`)과 `EXPECTED_AUTH_ERROR_CODES`의 토큰 복구 오류를 제외한다. 코드 없는 HTTP 401/403/404/409도 제외한다. S3 PUT의 403/404는 이 규칙의 대상이 아니다.
4. operation별 `expectedErrors`를 적용한다. `exclude`는 정상 거부, `user-input`은 실제 요청에서 확인한 사용자 입력 제약 위반일 때만 제외, `oauth-cancelled`는 확인된 동의 취소일 때만 제외한다.
5. 나머지 핵심 작업·복구 UI 실패를 수집한다. 일반 query/mutation은 추가 4xx를 핵심 작업/복구 UI 경계에 위임한다.

`REQUEST_VALIDATION_FAILED`는 400/422라는 이유만으로 제외하지 않는다. 서버가 지목한 모든 필드가 실제 사용자 입력 제약 위반으로 확인되어야 한다. 제목 누락, 내부 본문 구조 오류, 정상 입력을 서버가 거부한 경우는 수집한다. BE reason/UI 메시지 원문으로 판단하지 않는다.

## 핵심 operation

아래 목록에 공통 토큰 복구·권한·부재·중복 규칙이 함께 적용된다. `REQUEST_VALIDATION_FAILED`와 생성 시 `INVALID_SLUG`는 조건부 제외다.

| operation / feature | API | 정상 제외 후보 | BE 근거 |
| --- | --- | --- | --- |
| `draft.save` / writing | POST `/v1/drafts` | REQUEST_VALIDATION_FAILED, USER_NOT_FOUND, RILOG_NOT_FOUND | [DraftService](../../backend/src/main/java/kr/rilog/domain/post/service/DraftService.java), [DTO](../../backend/src/main/java/kr/rilog/domain/post/controller/dto/request/DraftSaveRequest.java) |
| `draft.overwrite` / writing | PUT `/v1/drafts/{id}` | REQUEST_VALIDATION_FAILED, DRAFT_NOT_FOUND, NOT_POST_AUTHOR | [DraftService](../../backend/src/main/java/kr/rilog/domain/post/service/DraftService.java), [Post](../../backend/src/main/java/kr/rilog/domain/post/entity/Post.java) |
| `draft.publish` / writing | PUT `/v1/drafts/{id}/publish` | REQUEST_VALIDATION_FAILED, DRAFT_NOT_FOUND, NOT_POST_AUTHOR, USER_NOT_FOUND, BLOG_MEMBER_DOESNT_NOT_BELONG, ALREADY_BLOG_MEMBER_LEFT, CHAPTER_NOT_FOUND, DUPLICATED_PUBLISH, RILOG_POST_PUBLISH_FORBIDDEN | [DraftService](../../backend/src/main/java/kr/rilog/domain/post/service/DraftService.java), [Publisher](../../backend/src/main/java/kr/rilog/domain/blog/model/Publisher.java), [Post](../../backend/src/main/java/kr/rilog/domain/post/entity/Post.java) |
| `post.publish` / writing | POST `/v1/posts` | REQUEST_VALIDATION_FAILED, BLOG_NOT_FOUND, USER_NOT_FOUND, RILOG_NOT_FOUND, CHAPTER_NOT_FOUND, RILOG_POST_PUBLISH_FORBIDDEN, COLOG_POST_PUBLISH_FORBIDDEN | [PostService](../../backend/src/main/java/kr/rilog/domain/post/service/PostService.java) |
| `post.update` / writing | PUT `/v1/posts/{id}` | REQUEST_VALIDATION_FAILED, POST_NOT_FOUND, NOT_POST_AUTHOR, CHAPTER_NOT_FOUND, BLOG_MEMBER_DOESNT_NOT_BELONG, ALREADY_BLOG_MEMBER_LEFT | [PostService](../../backend/src/main/java/kr/rilog/domain/post/service/PostService.java), [BlogMember](../../backend/src/main/java/kr/rilog/domain/blog/entity/BlogMember.java) |
| `colog.create` / colog | POST `/v1/cologs` | REQUEST_VALIDATION_FAILED, INVALID_SLUG, USER_NOT_FOUND, BLOG_SLUG_ALREADY_EXISTS, BLOG_PROFILE_NAME_ALREADY_EXISTS, USER_COLOG_COUNT_EXCEEDED | [CologService](../../backend/src/main/java/kr/rilog/domain/blog/service/CologService.java), [DTO](../../backend/src/main/java/kr/rilog/domain/blog/controller/dto/request/CologCreateRequest.java) |
| `colog.invite` / colog | POST `/v1/cologs/{slug}/members` | REQUEST_VALIDATION_FAILED, BLOG_NOT_FOUND, USER_NOT_FOUND, BLOG_MEMBER_INVITE_FORBIDDEN, ADMIN_PERMISSION_REQUIRED, BLOG_MEMBER_ALREADY_EXISTS, COLOG_MEMBER_COUNT_EXCEEDED, USER_COLOG_COUNT_EXCEEDED | [CologService](../../backend/src/main/java/kr/rilog/domain/blog/service/CologService.java), [BlogMember](../../backend/src/main/java/kr/rilog/domain/blog/entity/BlogMember.java) |
| `oauth.callback` / auth | POST `/v1/auth/github/callback` | INVALID_OAUTH_STATE, 확인된 취소의 OAUTH_REQUEST_FAILED | [GithubOAuthController](../../backend/src/main/java/kr/rilog/domain/auth/presentation/GithubOAuthController.java), [AuthErrorInformation](../../backend/src/main/java/kr/rilog/domain/auth/exception/AuthErrorInformation.java) |
| `upload.presign` / upload | POST `/v1/uploads/presigned-url` | REQUEST_VALIDATION_FAILED, UNSUPPORTED_IMAGE_FORMAT, IMAGE_SIZE_EXCEEDED, UNSUPPORTED_FILE_FORMAT, FILE_SIZE_EXCEEDED | [UploadService](../../backend/src/main/java/kr/rilog/domain/upload/service/UploadService.java) |
| `upload.put` / upload | PUT S3 서명 URL | 없음. 사용자 취소·오프라인은 공통 제외 | [FE 업로드 조합 함수](../../frontend/src/shared/api/uploads/api.ts) |

`query`/`mutation`은 여러 API를 관측하는 공통 경계이므로 feature는 `api`, `content.load`는 `content`, 작업을 모르는 자동 수집은 `unhandled`/`api`다. 공통 경계에서는 USER_COLOG_COUNT_EXCEEDED, COLOG_MEMBER_COUNT_EXCEEDED, CHAPTER_COUNT_EXCEEDED, COMMENT_REPLY_DEPTH_EXCEEDED를 정상 업무 제한으로 취급한다. 핵심 작업에서는 해당 operation에 등재된 제한만 제외한다.

OAuth 파라미터 누락, GitHub 토큰 교환·사용자 조회 실패, 확인되지 않은 OAUTH_REQUEST_FAILED는 보고한다. 업로드 후 FE가 관측하는 발행·저장 실패는 해당 operation으로 보고하지만, 커밋 후 BE 비동기 이미지 태깅은 FE에서 관측할 수 없고 이전 결정대로 Sentry 연동 대상이 아니다.

## 전송 메타데이터

제목은 `[feature] operation failed: errorCode (httpStatus; error_type)` 형식이다. 예: `[writing] draft.publish failed: INVALID_POST_CONTENT (400; api)`. 입력 내용·URL·서버 메시지와 요청마다 달라지는 ID를 넣지 않는다.

| 태그 | 값과 누락 처리 |
| --- | --- |
| `feature` | operation 계약의 고정 feature. 임의 문자열을 허용하지 않음 |
| `operation` | 계약 목록의 고정 이름. 없거나 알 수 없으면 `unhandled` |
| `errorCode` | 공개 코드 형식의 문자열. 형식이 부적절하면 `UNKNOWN_ERROR_CODE`, 코드 없는 오류는 `NO_ERROR_CODE` |
| `httpStatus` | 실제 Response의 상태. 응답 없는 통신 오류는 `NO_RESPONSE` |
| `request_id` | UUID 형식의 `X-Request-ID`. 없거나 부적절하면 생략. FE가 임의로 생성하지 않음 |
| `error_code`, `status` | 기존 검색 호환용 별칭. 각각 API 코드/HTTP 응답이 있을 때 유지 |
| `error_type`, `error_kind` | 정규화 분류. kind는 API 오류에서만 기록 |

request_id는 [RequestIdFilter](../../backend/src/main/java/kr/rilog/global/logging/RequestIdFilter.java)가 생성하고 [CorsConfig](../../backend/src/main/java/kr/rilog/global/config/CorsConfig.java)가 브라우저에 노출한다. 제목에는 넣지 않아 요청마다 같은 장애의 제목이 달라지는 것을 피한다. 자동 수집과 명시 보고 모두 같은 변환·최종 필터를 사용한다.

## 계약 변경 절차와 검증

BE 오류 추가 시 공개 코드·HTTP 상태·의미와 실제 발생 operation을 확인한다. FE 코드표, `expectedErrors`의 조건, 위 표와 관련 정책 테스트를 함께 갱신한다. 알려진 코드라는 이유만으로 새 정상 제외 항목을 추가하지 않는다. 앱이 만든 요청 문제와 5xx는 목록에 넣어 숨기지 않는다. 이 변경은 FE 수집 기준만 바꾸며 BE 응답 계약에는 영향이 없다.

정책 단위 테스트는 모든 operation의 5xx/통신/미정의 코드 수집, 취소·오프라인 제외, 400/422 입력 검증, 작업별 정상 제한을 검증한다. 전송 테스트는 제목·태그, 잘못된 ID/코드 정리와 원본 스택·민감정보 처리를 검증한다. 기존 mutation/OAuth/업로드 통합 테스트는 실제 보고 경계 연결과 중복 억제를 검증한다.
