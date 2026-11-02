# ADR 0021: 외부 이미지 가져오기의 Spring 중계와 HMAC 인증

- **상태:** 승인
- **날짜:** 2026-10-29
- **소유자:** Backend

## 맥락 (문제점)
기존(ADR 0018)에는 브라우저가 인증 없이 이미지 서버를 직접 호출해 S3(`images/imported/{UUID}.webp`)에 저장했다. 이로 인해 두 가지 문제가 있었다.
- **보안 취약:** 호출자 인증이 없어 누구나 S3에 이미지를 쓸 수 있었고, IP rate limit만으로 방어하고 있었다.
- **관리 불가:** 저장 경로(key)에 `userId`가 없어 소유권을 판별할 수 없고, 기존 S3 수명주기(`TEMPORARY` → `CONFIRMED` 태그 처리 및 미사용 이미지 자동 정리)와 압축 파이프라인을 태울 수 없었다.

## 결정 (핵심 내용)

### 1. 호출 흐름: 브라우저 → Spring → 이미지 서버
- **클라이언트 → Spring:** `POST /v1/uploads/image-imports` (`@AuthGuard(ACCESS, ONBOARDING)`)를 호출한다.
  - 요청: `{sourceUrl, imagePurpose: PROFILE | CONTENT}` (`imagePurpose` 필수)
  - 응답: `data: {objectKey, url}`
- **Spring → 이미지 서버:** Spring은 다운로드·변환·저장을 직접 하지 않고 중계만 한다. 토큰에서 추출한 `userId`를 본문에 합쳐 이미지 서버 `POST /api/images/import`로 전달한다(본문: `{sourceUrl, userId, imagePurpose}`).
- **코드 구조:** 서비스 계층은 `ImageImportGateway`(`upload/service/gateway`) 인터페이스만 의존한다. 서명 생성, 통신, 오류 변환 등 구체적인 로직은 `ImageServerImportGateway`(`upload/infrastructure/imageserver`) 구현체에 둔다. 구현체 이름은 배포 위치(EC2 등)가 아니라 상대 시스템을 따르며, 배포 위치가 바뀌면 `base-url`만 수정하고 방식 자체가 바뀌면 새 구현체를 추가한다.

### 2. 구간 보안: HMAC 서명 검증
- **서명 규격:** ADR 0016과 동일하게 `{timestamp}\nPOST\n{path}\n{sha256(body)}`를 HMAC-SHA256으로 서명한다.
- **헤더 및 유효시간:** `X-Rilog-Image-Timestamp`, `X-Rilog-Image-Signature: v1=<hex>` 헤더를 사용하며, 시간 오차는 과거 300초~미래 30초까지 허용한다.
- **비밀키:** Spring(`INTERNAL_IMAGE_SERVER_SECRET`)과 이미지 서버(`RILOG_IMAGE_SERVER_SECRET`)에 기본값 없는 32자 이상의 비밀키를 설정한다.
- **검증 시점:** 이미지 서버는 동시 처리 슬롯 점유나 본문 파싱보다 **서명 검증을 가장 먼저 수행**하며, 실패 시 즉시 `401 INVALID_SIGNATURE`를 반환한다.
- **CORS 제거:** 브라우저가 이미지 서버를 직접 호출하지 않으므로 이미지 서버 Nginx에서 CORS 설정을 제거한다.

### 3. S3 저장 규칙 통일 (기존 파이프라인 재사용)
- **Key 생성:** 이미지 서버가 `{S3_ROOT_DIRECTORY}/{images|profiles}/raw/{userId}-{UUID}/original.webp` 경로를 생성한다.
- **태그 및 수명주기:** 저장 시 `status=TEMPORARY` 태그를 붙이고, 사용 확정 시 기존 로직이 `CONFIRMED`로 바꾼다. Presigned 업로드(ADR 0020)와 구조가 같아 소유권 판별, 압축 Lambda, 태그 처리를 그대로 재사용한다.

### 4. 오류 처리 분리
- **요청/외부 원인 오류 (그대로 전달):** 잘못된 요청이나 외부 이미지 소스 문제(`INVALID_URL`, `UNSAFE_HOST`, `IMAGE_TOO_LARGE`, `INVALID_IMAGE`, `UNSUPPORTED_ENCODING`, `BUSY`, `SOURCE_REJECTED`, `SOURCE_UNAVAILABLE`, `SOURCE_TIMEOUT`)는 이미지 서버의 HTTP 상태 코드와 에러 코드를 Spring 오류 형식(`errorCode`)에 그대로 담아 프론트에 전달한다.
- **시스템/내부 오류 (502 통일):** 서명 불일치, S3 저장소 오류, 서버 내부 오류, 연결 실패, 알 수 없는 응답은 모두 `502 IMAGE_IMPORT_UNAVAILABLE`로 반환한다.

## 이유와 검토한 대안
- **Spring이 S3 key까지 만들어서 전달하는 안:** Key 생성 규칙이 Spring 한 곳에 모이는 장점은 있지만, Spring이 단순 중계를 넘어 이미지 서버의 저장 규칙까지 알게 된다. 이미지 서버는 목적별 디렉터리와 파일 형식만 알고, 소유권 판별·압축 규칙은 기존처럼 Spring(`S3ImageObjectKeyPolicy`)이 관리하도록 역할을 나눴다.
- **`userId`를 헤더로 전달하는 안:** 헤더로 빼면 서명 대상 문자열에 별도 줄을 추가해야 한다. 본문(Body)에 넣으면 기존 본문 해시 검증만으로 `userId`와 `sourceUrl`의 위변조를 한 번에 막을 수 있다.
- **모든 이미지 서버 오류를 502로 통일하는 안:** 프론트엔드가 잘못된 URL 입력, 지원하지 않는 형식, 서버 혼잡(`429 BUSY`) 상황을 구분해 사용자에게 안내할 수 없어 제외했다.

## 결과와 후속 작업
- **환경별 비밀키 공유 주의:** dev와 prod Spring이 같은 이미지 서버를 바라보면 같은 비밀키를 써야 한다. 서명에 환경(env) 값을 넣지 않으므로, dev 비밀키가 유출되면 prod 경로 요청에도 악용될 수 있다.
- **비밀키 교체 리스크:** 키 교체는 양쪽 서버를 함께 바꾸는 수동 작업이며, 배포 시점 차이로 잠시 `502`가 발생할 수 있다.
- **재전송 허용:** 5분 이내의 동일 서명 재전송은 따로 막지 않는다. 같은 요청이 오면 새 UUID 객체가 하나 더 생기지만, 쓰이지 않는 객체는 `TEMPORARY` 수명주기 규칙에 따라 자동 삭제된다.
- **Rate Limit 및 헤더 제한:** 이미지 서버 Nginx의 IP rate limit은 이제 사용자 IP가 아닌 Spring 서버 IP로 합산된다. 또한 이미지 서버의 `429 BUSY` 응답 시 `Retry-After` 헤더는 Spring을 거치며 제외된다.
- **IAM 권한 변경:** 이미지 서버(EC2 IAM Role)에 `{root}/images/raw/*`, `{root}/profiles/raw/*`의 `s3:PutObject`, `s3:PutObjectTagging` 권한을 추가하고, 기존 `images/imported` 권한은 제거한다. (기존에 저장된 `images/imported` 객체는 마이그레이션하지 않는다.)
- **배포 순서:**
  1. Spring과 이미지 서버에 비밀키 환경변수 설정
  2. 이미지 서버 배포 *(이 시점부터 기존 브라우저 직접 호출은 401로 차단됨)*
  3. Spring 배포
  4. 프론트엔드 새 API로 전환 배포
