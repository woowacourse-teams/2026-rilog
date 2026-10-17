# 게시글 조회 등록 API — #751

## 구현 범위

기존 Counter·Caffeine·게시글별 ReentrantLock과 1시간 중복 제한을 유지하고 등록 POST와 기존 삭제 권한을 이용한 상세 조회수 읽기를 연결한다. 프론트엔드, DB 배치 writer·저장 스케줄·종료 저장 및 공통 API rate limiter는 이번 변경에 포함하지 않는다.

## API 계약

### POST /v1/posts/{postId}/views

본문 없이 호출한다. 인증 헤더가 있으면 기존 OptionalAuthGuard로 검증한 계정 ID를 사용하고, 비회원은 `rilog_visitor` UUID 쿠키를 사용한다. 클라이언트가 전달한 작성자 ID로 권한을 판단하지 않는다. 발행·미삭제 게시글을 본문 없는 projection으로 읽고 기존 비공개 읽기 정책을 확인한다.

작성자 본인의 요청은 Counter 생성·방문 기록·조회수 증가 없이 종료한다. 다른 독자의 요청은 마지막 인정부터 1시간에 한 번 집계하며, 거절한 중복은 인정 시각을 미루지 않는다. 본인 여부를 확인할 수 없는 비회원 방문을 IP·과거 로그인과 합치지 않는다.

정상 처리·중복·작성자 방문 모두 **204 No Content**이며 조회수/accepted 응답 DTO를 만들지 않는다. 유효한 방문자 쿠키는 재사용한다. 없거나 잘못된 UUID면 새 UUID를 발급하고 성공 응답에만 Set-Cookie를 추가한다. 회원에게는 방문자 쿠키를 발급하지 않는다.

새 방문자 쿠키는 HttpOnly, Path=/v1, Max-Age=30일이며 Secure와 SameSite는 배포 설정을 따른다. 브라우저 식별자의 30일 수명과 글별 1시간 중복 제한은 다르다. 쿠키 삭제·다른 브라우저·시크릿 모드는 새 독자로 간주한다. 최초 쿠키 없는 병렬 요청도 서로 다른 UUID를 발급받을 수 있다. UUID 쿠키는 봇의 ID 교체를 막는 수단이 아니다.

없는/초안/삭제 글은 404, 비공개 글의 비작성자 요청은 403, 잘못된 인증 헤더·토큰은 기존 인증 오류로 처리한다. 비활성 상태는 POST_VIEW_REGISTRATION_DISABLED(503)이며 Counter와 DB 조회를 시작하지 않는다.

### 상세 GET의 조회수 공개

기존 PostDetailResponse의 `viewCount`는 nullable Long이다. 기존 `viewerPermissions.canDelete()` 결과가 true일 때만 현재 값을 채우고 false이면 명시적 null을 반환한다. 권한 클래스·역할 분기·canViewCount 필드를 새로 만들지 않는다. Colog OWNER·ADMIN·작성자도 기존 삭제 권한 판정을 그대로 따른다. 글 작성자여도 기존 삭제 권한이 없다면 숫자는 반환하지 않는다.

상세 읽기 권한을 먼저 검증한다. 이번 변경으로 비공개 글의 기존 읽기 권한을 넓히지 않는다. 기존 Counter가 있으면 현재 값을 읽고 없으면 DB 누계를 읽으며 GET만으로 Counter/방문 기록을 만들지 않는다. 누계 누락·범위 오류를 0으로 숨기지 않는다. Post 엔티티·DB·Counter의 숫자는 null로 바꾸지 않는다.

### 피드 GET

전체·블로그·챕터·트렌딩 피드는 작성자·관리자·비회원 모두 **viewCount 필드 자체가 없다.** 피드용 조회수 읽기와 DTO·컨트롤러·서비스 변경은 원복했다. 불필요해진 bulk 저장소 API, projection과 DB loader도 제거하여 기존 조회 구조를 유지한다.

## 프론트엔드 연동 계약과 호환성

호버/prefetch는 GET만, 실제 상세 진입은 POST를 호출한다. 본문 표시를 POST 완료까지 기다리지 않는다. POST 후 재조회는 필수가 아니며 POST에 숫자가 없으므로 다른 독자의 동시 방문에 따른 숫자 변경은 다음 GET에서 확인한다. 본인 방문은 증가하지 않으므로 작성자가 진입한 순간 +1을 보여줄 필요가 없다.

상세 응답 DTO나 API를 권한별로 나누지 않는다. 프론트엔드는 기존 삭제 버튼의 `viewerPermissions.canDelete` 조건으로 조회수도 표시할 수 있다. 숫자 0도 정상 값이다. 기존 항상 숫자였던 상세 필드는 권한이 없으면 null이 될 수 있어 API 소비자의 schema/type 확인이 필요하다. 피드 응답에는 신규 필드를 추가하지 않는다. 이번 변경에서 frontend 파일은 수정하지 않는다.

교차 origin 호출에서는 브라우저가 방문자 쿠키를 저장·전송하도록 credentials를 설정해야 한다. 기존 서버 CORS는 허용 origin과 allowCredentials를 사용한다. SameSite는 실제 사이트 관계에 맞춰 선택하며, cross-site가 필요한 경우 None+Secure가 필요하다. HttpOnly 쿠키를 프론트 JS에서 직접 읽을 필요는 없다. 기존 리프레시 토큰 쿠키와 합치지 않는다.

## 개발 활성화와 운영 전제

기본값은 **등록 비활성**이다. 개발 연동 환경에서만 명시적으로 켠다.

```bash
POST_VIEW_REGISTRATION_ENABLED=true
POST_VIEW_COOKIE_SECURE=false  # 로컬 HTTP에서만. HTTPS 환경은 true
POST_VIEW_COOKIE_SAME_SITE=Lax
```

DB writer가 없는 상태에서 증가분은 JVM 메모리에만 남는다. 재시작·비정상 종료 시 유실되고, 단일 인스턴스 전제이며 여러 서버 간 중복 제거/누계 공유는 보장하지 않는다. DB 배치 저장과 요청 폭주 보호를 완료하기 전 운영 집계를 활성화하지 않는다. 이번 변경은 집계 API 연결이며 서버 종료 drain을 구현한 것으로 해석하지 않는다.

## 검증

- 기존 Queue/Caffeine의 시간 경계·락·배치 상태 계약 유지.
- 본인 방문 생략·다른 회원/비회원 집계·쿠키 재사용/교체·비공개/초안/삭제 차단·비활성 503.
- 실제 Spring MVC에서 본인/비회원 GET·POST, 빈 204, Set-Cookie 및 DB 미변경.
- 상세의 기존 canDelete와 viewCount 공개 일치: 활성 OWNER/ADMIN/작성자는 숫자, MEMBER 비작성자·비회원·탈퇴한 작성자는 null.
- 기존 상세 읽기 권한 유지, 피드·트렌딩 HTTP 응답에서 viewCount 숫자와 null 모두 필드 자체가 없는지 확인.

로컬 테스트 스킬을 적용한 전체 재실행에서 testH2·testMySql·기본 test 각 1,295개가 실패·오류·건너뛰기 없이 통과했고 build도 성공했다. 해당 실행을 시작한 뒤 DTO 전용 테스트 2개가 제거되었으므로 실행 건수에는 그 2개가 포함된다. 응답 공개 계약은 실제 HTTP 테스트에 유지한다. DTO 제거 후 테스트 소스 컴파일도 통과했고, 제거된 테스트의 소스와 클래스 파일이 남지 않았음을 확인했다.

새 서비스 통합 테스트는 실제 ServiceSupport와 저장소를 사용한다. 쿠키·읽기 검증 조합은 낮은 계층에서 보호하고, 서비스와 실제 HTTP 테스트는 연결·권한·204·기본 비활성 계약을 검증한다. 한글 DisplayName·마침표, given/when/then, AssertJ와 enum 예외 메시지 규칙을 적용했다.

앞선 작성자 전용/피드 포함 버전 검증은 H2·MySQL·기본 test 각 1,278개였으나 최종 공개 정책 검증 결과로 사용하지 않는다. 초기 MySQL 실행에서 기존 알림 통합 테스트 6개가 실제 수신자 users 행 없이 INSERT하여 FK에 실패했다. 변경 전 HEAD를 별도 /private/tmp 소스에서 실행해 동일 6/7 실패를 재현한 뒤 NotificationServiceIntegrationTest의 수신자 fixture만 실제 사용자 생성+생성된 ID 사용으로 보정했다. 알림 운영 코드는 변경하지 않았다.

새 k6 부하 측정은 실행하지 않았고 frontend·DB writer는 검증 범위 밖이다.

상세 GET/HEAD의 별도 캐시 제어 인터셉터는 사용자 요청으로 제거했다. HTTP 캐시 정책은 이번 조회수 구현에서 추가하지 않는다.

캐시 인터셉터 제거 후 PostViewWebIntegrationTest·PostViewConfigTest·PostViewDisabledWebIntegrationTest의 H2 테스트 8개가 모두 통과했다. 이 제거 변경에 대해 MySQL 전체 재실행은 하지 않았다.
