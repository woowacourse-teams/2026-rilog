# ADR 0018: 외부 이미지 가져오기 전용 Node 서버

- 상태: 승인
- 날짜: 2026-10-28
- 소유자: Backend

## 맥락

외부 CDN URL을 본문에 직접 참조하면 원본 변경·삭제가 Rilog 글에 영향을 준다.
외부 이미지를 별도 S3 객체로 복제하고 micro EC2의 빌드 부담을 줄이는 배포가 필요하다.

## 결정

- 저장소 루트 image-server에 독립 Node 프로젝트를 둔다. 기존 frontend/backend 코드는 변경하지 않는다.
- POST /api/images/import가 sourceUrl을 받아 검증·WebP 변환·S3 저장 후 key/url을 반환한다.
- HTTP 오류는 error.code/message 형식이다. 기존 Spring API에는 영향이 없으며 프론트 연동은 후속 작업이다.
- Nginx/Certbot은 Ubuntu 호스트에서 실행하고 Docker API는 127.0.0.1:8000에 공개한다.
- 호출자 인증은 도입하지 않고 Nginx IP rate limit, 작업 동시성 1, 다운로드·디코딩 상한을 둔다.
- 임의 외부 URL 요청은 DNS/IP 검증과 연결 대상 고정, 리다이렉트 금지로 내부망 접근을 제한한다.
- Docker 이미지는 외부에서 빌드해 koreaioi/rilog-image-server:latest에 push한다. EC2는 image.env와 Compose로 pull/run한다.

## 이유와 검토한 대안

Spring에서 직접 다운로드하면 기존 API 서버와 자원·장애를 공유한다. 독립 EC2로 처리 부하를 분리한다.
Python도 가능하지만 Node/sharp와 프론트의 JS 경험을 활용한다. sharp의 스레드·캐시를 제한한다.
압축하지 않는 복제 대신 정적 WebP로 정규화한다. 원본 바이트 보존과 애니메이션은 지원하지 않는다.

## 결과와 후속 작업

- frontend는 새 API 응답 후 src를 교체하고 busy/실패/저장 중 상태를 처리해야 한다. 기존 presigned 업로드는 유지한다.
- ADR 0017의 originals 키·ImageAsset·참조·태그 수명주기에 자동 편입하지 않는다. 별도 prefix를 사용한다.
- backend의 자산 등록/삭제 정책과 연결하기 전에는 가져온 객체가 자동 정리되지 않는다. S3 이벤트 prefix도 검토한다.
- 외부 요청이 느리거나 실패하면 재시도가 필요하고, 저장 후 연결 실패는 고아·중복 객체를 남길 수 있다.
- latest의 digest를 배포 때 기록한다. 롤백은 이전 이미지 digest로 컨테이너를 교체한다. S3 객체는 유지된다.
- 실제 EC2 IAM·S3·조회 경로·TLS와 최대 크기 이미지 부하 검증은 운영 환경에서 수행한다.
