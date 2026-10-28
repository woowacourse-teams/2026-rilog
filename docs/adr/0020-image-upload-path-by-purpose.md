# ADR 0020: 목적별 이미지 원본 경로

- 상태: 승인
- 날짜: 2026-10-28
- 소유자: Backend

## 맥락

프로필 이미지와 일반 이미지(본문, 썸네일, 커버)는 필요한 압축 너비가 다르다. 압축 key 규칙
(`{root}/{images|profiles}/compact/{userId}-{UUID}/{width}.webp`)은 이미 있지만, presigned 업로드는
`{root}/images/originals/{userId}-{UUID}.{ext}`에 저장해 목적을 구분할 수 없었다.
이미지 자산·참조 관리는 ADR 0019로 중단했으므로 이미지 수명주기는 경로 기반 소유권 판별과 S3 태그만으로 관리한다.

## 결정

- `POST /v1/uploads/presigned-url`은 하나로 유지하고 `imagePurpose: PROFILE | CONTENT`를 추가한다.
  - `PROFILE` → `{root}/profiles/raw/{userId}-{UUID}/original.{ext}`
  - `CONTENT` → `{root}/images/raw/{userId}-{UUID}/original.{ext}`
  - `{ext}`는 기존처럼 contentType에서 정한다. 압축본은 같은 `{userId}-{UUID}` 디렉터리의 compact 경로를 쓴다.
- 프론트 배포 전 호환을 위해 `type=IMAGE`에서 `imagePurpose`를 생략하면 `CONTENT`로 처리한다. `type=FILE`이면 무시한다.
- PROFILE도 기존 IMAGE 형식·크기 규칙을 쓴다. 압축 Lambda가 변환하지 않는 형식(gif, svg, heic)은 압축본 없이 원본만 쓴다.
- 업로드 태그는 ADR 0019의 정책대로 `TEMPORARY`이고, 게시글 저장 시 `CONFIRMED`로 바꾼다.
- `S3ImageObjectKeyPolicy`의 관리·소유권 판별은 raw 원본, compact 압축본, 기존 originals 원본을 모두 인식한다.
  S3 마이그레이션 전까지 기존 URL이 DB에 남아 있으므로 originals를 빼면 다른 사용자가 그 이미지를 TEMPORARY로 바꿀 수 있다.

## 이유와 검토한 대안

- 목적별 API 분리: 검증·권한·응답이 같아 중복만 늘어난다. 하나의 API와 목적 enum으로 유지한다.
- `imagePurpose` 즉시 필수: 프론트와 동시 배포가 필요해 배포 순서에 따라 업로드가 400으로 막힌다. 기본값 처리 후 필수로 바꾼다.

## 결과와 후속 작업

- 프론트는 presigned 요청에 `imagePurpose`를 보낸다. 프론트 배포 후 `imagePurpose`를 필수로 바꾼다.
- raw 경로는 압축 Lambda의 S3 이벤트 대상이다. 사용 확정 후 Spring이 이미지 서버의 압축 API를 호출하는 구조로 바꾸기 전까지 Lambda 트리거를 조정한다.
- 외부 이미지 가져오기 서버(ADR 0018)는 아직 `images/imported`에 저장한다. 다음 작업에서 Spring 중계 방식으로 바꾸면서 같은 목적별 raw 경로를 적용한다.
- 기존 originals 객체의 신경로 이전은 `backend/deploy/s3-image-migration`으로 별도 진행하고, 이전 후 originals 인식 제거를 검토한다.
