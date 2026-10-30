# ADR-0022: 사용 확정 시 Spring이 이미지 서버에 압축 요청

- 상태: 승인
- 날짜: 2026-10-30
- 소유자: Backend

## 맥락

압축 Lambda(ADR 0016)는 `{root}/{images|profiles}/raw/` 생성 S3 이벤트마다 압축본을 만든다.
업로드만 하고 쓰지 않은 이미지까지 압축하고, 압축 너비가 Lambda와 백엔드에 나뉘어 있다.
ADR 0020은 사용 확정(CONFIRMED) 뒤 Spring이 이미지 서버의 압축 API를 호출하는 구조로 바꾸기로 했다.

## 결정

- Spring은 `S3ObjectTagger`가 CONFIRMED 태그를 붙이는 데 성공한 raw 원본마다 이미지 서버 압축 API를 호출한다.
  `attach`는 모든 대상, `synchronize`는 새로 추가된 대상만 해당한다. TEMPORARY로 바꾸는 경우와 태깅 실패는 호출하지 않는다.
  확장자가 jpg, jpeg, png, webp, avif인 raw 원본만 보낸다(`S3CompactObjectKeyPolicy.isCompactable`). gif, svg, heic와 기존 originals는 원본만 쓴다.
- 이미지 서버 `POST /api/images/compact`, 본문 `{"objectKey": "<raw 원본 key>"}`, 가져오기와 같은 HMAC 서명(ADR 0021)을 쓴다.
  - WebP quality 80. `images`: 750, 1200, 1400, 2000 / `profiles`: 50, 360.
  - 원본보다 크거나 같은 너비는 확대하지 않고 원본 너비로 한 번 변환해 그 너비 이름의 key에 같이 저장한다(원본 1300px → `1400.webp`, `2000.webp`는 1300px).
  - 압축본 key: `{root}/{images|profiles}/compact/{userId}-{UUID}/{width}.webp`. 다시 확정되면 같은 key에 덮어쓴다. status 태그는 붙이지 않는다.
- 이미지 서버는 압축을 한 번에 하나씩 처리하고 최대 10건까지 대기시킨다. 대기열이 차면 429 `BUSY`다.
  요청마다 대기를 포함한 시한 45초를 두고, 넘으면 504 `COMPACT_TIMEOUT`이다. 진행 중인 변환 하나(최대 10초)는 끝나야 응답하므로 최대 약 55초다.
- 타임아웃 순서: 이미지 서버 최대 55초 < Nginx `proxy_read_timeout` 60초 < Spring `image-server.compaction-read-timeout` 70초.
- Spring 호출은 전용 `imageCompactionExecutor`(2 스레드, 대기 500)에서 비동기로 한다. 태깅 executor와 요청 스레드를 막지 않는다.
- 실패 응답과 연결 실패는 `image_compaction_failed` ERROR 로그만 남긴다. 응답을 기다리다 끊긴 경우(read timeout)는
  이미지 서버에서 끝났을 수 있으므로 `image_compaction_response_lost` WARN만 남긴다. 어느 경우도 다시 시도하지 않는다.
- 게시글 본문 등에 저장된 원본 URL은 바꾸지 않는다. 화면은 압축본을 먼저 쓰고 없으면 원본을 쓴다(프론트엔드 적용은 별도 작업).

## 이유

- 쓰이는 이미지만 압축하고, 이미 가져오기를 맡은 이미지 서버(sharp, S3 권한)를 재사용한다.
- 압축은 표시 최적화일 뿐이고 원본으로 대체할 수 있어, 큐·재시도 없이 실패 로그만으로 충분하다.

## 검토한 대안

- Lambda S3 이벤트 유지: 버린 업로드까지 압축하고 확정 여부를 알 수 없다.
- 이미지 서버가 202로 바로 응답하고 백그라운드 처리: Spring이 실패를 알 수 없어 실패 로그 요구를 만족하지 못한다.
- 너비를 Spring이 보내는 방식(ADR 0016처럼 백엔드 단일 관리): 요청 형식이 늘고, 압축 규칙은 이미지 서버의 책임으로 두기로 했다.
  기존 Lambda 내부 API의 `CompactionTarget`과 너비가 중복되므로 Lambda 제거 시 함께 정리한다.

## 결과와 후속 작업

- 얻는 이점: 사용 확정된 이미지만 압축, Lambda 이벤트·SQS 의존 제거 가능.
- 감수하는 비용/위험:
  - 확정 직후에는 압축본이 아직 없다. 화면이 원본으로 대체해야 한다.
  - 이미지 서버 장애·재시작 중 확정된 이미지는 압축되지 않고 남는다. 다시 확정(다른 글에 다시 사용)될 때만 압축된다.
  - 512MiB 컨테이너에서 가져오기 1건과 압축 1건이 동시에 돌 수 있다. 압축은 최대 5,000만 화소, 원본 10MiB까지 받는다.
  - 압축본은 원본이 수명주기로 지워져도 남는다(Lambda 때와 같음).
- migration/rollback:
  1. 이미지 서버 EC2 IAM Role에 `{root}/{images|profiles}/raw/*` `s3:GetObject`, `{root}/{images|profiles}/compact/*` `s3:PutObject`를 추가한다.
  2. 이미지 서버 배포, Nginx에 `/api/images/compact` location 추가 후 reload.
  3. Spring 배포. 원본 하나를 게시글에 써서 compact 객체가 생기는지 확인한다.
  4. raw 접두사의 S3 이벤트 알림(Lambda 트리거)을 제거한다. 그 전까지는 둘 다 압축본을 만들고 같은 key에 쓴다.
  - 롤백: S3 이벤트 알림을 다시 만들고 Spring을 이전 버전으로 되돌린다.
- 다시 검토할 조건: 압축 실패가 잦거나 누락 이미지를 다시 압축해야 할 때(재시도 큐, 일괄 재압축 도구).
