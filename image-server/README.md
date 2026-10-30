# Rilog image server

외부 이미지 URL을 다운로드하고 정적 WebP로 변환해 S3의 독립 객체로 저장한다.
클라이언트는 Spring `POST /v1/uploads/image-imports`를 호출하고, Spring이 사용자 ID를 서명해 이 서버로 중계한다.
Node 24, Express(HTTP), sharp(이미지 검증·변환), ipaddr.js(IP 분류), AWS SDK v3(S3)를 사용한다.
Python 서버 대신 기존 JS 개발 경험과 sharp를 활용하며, 새 의존성은 lock 파일로 고정한다.
Nginx와 Certbot은 Ubuntu 호스트에 설치한다. API는 프로세스당 한 작업만 허용한다.

## API

`GET /healthz`는 liveness만 확인한다. S3 접근이나 외부 연결 성공을 보장하지 않는다.

`POST /api/images/import`, JSON 최대 32KiB(Spring의 sourceUrl 4,096자를 비ASCII·이스케이프까지 수용). Spring 전용이며 HMAC 서명이 필요하다:

```json
{"sourceUrl":"https://external.example.com/photo.png","userId":7,"imagePurpose":"CONTENT"}
```

- 헤더: `X-Rilog-Image-Timestamp: <unix 초>`, `X-Rilog-Image-Signature: v1=<hex>`.
- 서명: `HMAC-SHA256(RILOG_IMAGE_SERVER_SECRET, "{timestamp}\nPOST\n/api/images/import\n{sha256hex(본문 바이트)}")`.
  과거 300초, 미래 30초까지 받는다. 서명 검증은 동시 처리 슬롯과 본문 파싱보다 먼저 한다.
- `imagePurpose`: `PROFILE` → `profiles`, `CONTENT` → `images`. `userId`는 양의 정수.

성공: `201`, `{ "key": "<root>/images/raw/7-<uuid>/original.webp", "url": "https://delivery.example.com/<key>" }`.
key는 Spring presigned 업로드(ADR 0020)와 같은 `{root}/{images|profiles}/raw/{userId}-{UUID}/original.webp`이다.
동일 주소도 매번 새로운 UUID로 저장하고 `status=TEMPORARY` 태그를 붙인다. 조회 URL은 IMAGE_BASE_URL과 key를 결합한다.
오류: `{ "error": { "code": "INVALID_URL", "message": "..." } }`.
400: 잘못된 URL/내부망/DNS 정책/JSON/userId·imagePurpose, 401: 서명 오류, 413: 본문·파일 상한,
422: 지원하지 않는 이미지, 429: 처리 중(Retry-After: 2), 502: 원본 또는 S3 실패, 504: 다운로드 시간 초과.
Spring은 사용자 요청에서 비롯된 오류를 같은 상태·코드로, 그 밖의 오류는 502 `IMAGE_IMPORT_UNAVAILABLE`로 응답한다.

## 처리·보안 정책

- HTTPS 443만 허용, IP 직접 입력·사용자 정보 포함 URL·리다이렉트 차단.
- DNS의 모든 응답을 검사하고 검증된 IP로 연결한다. 사설망, 루프백, link-local, IPv4-mapped IPv6 등을 거부한다.
- 외부 요청에 사용자 쿠키/Authorization을 전달하지 않는다. 프록시 환경 변수도 사용하지 않는다.
- 다운로드 10초/10MiB, 정적 JPEG·PNG·WebP 1,600만 픽셀, 변환 10초, S3 요청 15초 제한.
- 파일 시그니처와 실제 디코딩을 검사한다. GIF/SVG/AVIF/애니메이션은 초기 지원에서 제외한다.
- WebP quality 85, 방향 보정, 메타데이터 제거. 원본 바이트 보존 방식이 아니다.
- 호출자는 Spring과 공유한 비밀키의 HMAC 서명으로 확인한다(ADR 0021). 브라우저가 직접 호출하지 않으므로 CORS는 두지 않는다.
- IP rate limit은 호스트 Nginx가 담당하며 Spring 서버 IP로 합산된다. 프론트의 다중 이미지 가져오기는 순차 처리한다.
- Nginx 타임아웃/사용자 연결 해제로 이미 시작된 S3 저장이 취소되는 것은 아니다. 실패·재시도로 고아/중복 객체가 생길 수 있다.

## 기존 이미지 수명주기와의 경계

`S3_ROOT_DIRECTORY`(Spring `AWS_S3_DIRECTORY`와 같은 값) 아래 목적별 raw 경로에 저장한다.
Spring의 경로 기반 소유권 판별, TEMPORARY/CONFIRMED 태그 처리, raw 이벤트의 압축 Lambda에 그대로 편입된다.
이전의 `images/imported` 객체는 이전하지 않는다. 결정은 `docs/adr/0018-external-image-import-server.md`,
`docs/adr/0021-image-import-via-spring-hmac.md`에 기록했다.

## 로컬 검증

```sh
npm ci
npm run check
npm test
```

S3를 실제 호출하지 않는 테스트에서 DNS 우회 차단, 스트리밍 크기 제한, 이미지 디코딩,
서명 검증, 목적별 raw 키 발급, 오류·동시 처리·health 흐름을 검증한다. 실제 IAM/버킷/CDN은 EC2 smoke test로 확인한다.

## 이미지 빌드·배포

저장소 루트에서 Docker Desktop/엔진을 실행하고 Docker Hub에 로그인한 뒤:

```sh
docker buildx build --platform linux/amd64,linux/arm64 -t koreaioi/rilog-image-server:latest --push ./image-server
```

이 이미지에는 src와 운영 의존성만 포함한다. `image.env`는 이미지/저장소에 넣지 않는다.
멀티 아키텍처 이미지로 t3.micro(amd64)와 t4g.micro(arm64)를 지원한다.
latest는 교체 가능한 태그이므로 배포 시 digest를 기록하고, 롤백에는 이전 digest를 사용한다.

EC2의 `/opt/rilog-image`에 `deploy/compose.yaml`을 복사하고
`deploy/image.env.example`을 참고해 같은 디렉터리에 **image.env**를 만든다.
IMAGE_BASE_URL은 기존 S3/CloudFront 조회 주소다. `image.rilog.kr`은 import API 주소이므로 넣지 않는다.
S3_ROOT_DIRECTORY와 RILOG_IMAGE_SERVER_SECRET은 Spring의 AWS_S3_DIRECTORY, INTERNAL_IMAGE_SERVER_SECRET과 같은 값이다.
EC2 IAM Role에 `{root}/images/raw/*`, `{root}/profiles/raw/*`의 s3:PutObject, s3:PutObjectTagging 권한을 주고
IMDSv2 required/hop limit 2를 사용한다.
SSE-KMS 버킷은 KMS 권한도 필요하다. AWS 키는 이미지에 포함하지 않는다.

```sh
cd /opt/rilog-image
sudo docker compose pull image-api
sudo docker compose up -d --no-build image-api
curl -fsS http://127.0.0.1:8000/healthz
sudo docker compose ps
```

RAM 512MiB + swap 최대 256MiB, 호스트 swap은 별도 설정한다. Node 8000은 127.0.0.1에만 바인딩한다.
메모리·CPU 한도는 시작점이며 실제 이미지 부하에서 측정해야 한다. unhealthy만으로 자동 재시작되지는 않는다.

## 호스트 Nginx·HTTPS

`deploy/nginx.conf.example`을 `/etc/nginx/sites-available/image.rilog.kr`로 복사한 뒤
sites-enabled에 심볼릭 링크를 만든다.
이 파일의 limit_req_zone은 Ubuntu의 기본 http include 위치에 둔다. 다른 파일에 중복 정의하지 않는다.
보안 그룹은 80/443 공개, SSH는 관리 IP에만 허용하고 8000은 열지 않는다.

```sh
sudo nginx -t
sudo systemctl reload nginx
sudo snap install --classic certbot
sudo /snap/bin/certbot --nginx -d image.rilog.kr --redirect
sudo /snap/bin/certbot renew --dry-run
sudo systemctl list-timers --all '*certbot*'
```

도메인 A 레코드는 고정 공인 IP를 가리켜야 한다. 인증서 발급·갱신에 80번이 필요하다.
TLS 적용 후 예시 HTTP 파일 전체로 덮어쓰지 않는다. Certbot이 추가한 HTTPS 설정을 유지한다.

```sh
curl -fsS https://image.rilog.kr/healthz
# 서명 없는 요청은 401 INVALID_SIGNATURE여야 한다.
curl -i https://image.rilog.kr/api/images/import \
  -H 'Content-Type: application/json' \
  --data '{"sourceUrl":"https://external.example.com/REPLACE_WITH_REAL_IMAGE.png","userId":1,"imagePurpose":"CONTENT"}'
sudo docker stats
sudo docker compose logs --tail=100 image-api
```

실제 저장은 Spring `POST /v1/uploads/image-imports`로 확인한다. 성공 응답, S3 객체와 TEMPORARY 태그, 반환 URL 조회를 모두 확인한다.
이 작업은 EC2에 자동 배포하지 않는다.
