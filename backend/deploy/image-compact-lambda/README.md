# image-compact-lambda

`{root}/{images|profiles}/raw/{userId}-{UUID}/original.{ext}`가 생성되면 webp 압축본을 만든다.

```
{root}/images/compact/{userId}-{UUID}/750.webp
{root}/images/compact/{userId}-{UUID}/1200.webp
{root}/images/compact/{userId}-{UUID}/1400.webp
{root}/images/compact/{userId}-{UUID}/2000.webp

{root}/profiles/compact/{userId}-{UUID}/50.webp
{root}/profiles/compact/{userId}-{UUID}/360.webp
```

- 압축 너비와 업로드 위치는 백엔드가 정한다. Lambda는 백엔드에서 받은 presigned URL로만 압축본을 올린다.
- webp quality 80
- 원본보다 큰 사이즈는 확대하지 않고 원본 크기로 변환한다. 원본이 800px이면 1200, 1400, 2000은 모두 800px이고, 파일은 항상 받은 너비 수만큼 만든다.
- jpg, jpeg, png, webp, avif만 변환한다. heic, svg, gif와 움직이는 webp/avif는 건너뛰고 원본을 그대로 쓴다.
- `raw/.../original.*`가 아닌 key는 무시한다. 결과물은 `compact/`에 쓰므로 다시 트리거되지 않는다.
- 압축본에서는 메타데이터(EXIF와 GPS, ICC 프로필, XMP, IPTC)를 모두 제거한다. 색 공간은 sRGB로 맞춘다.
- EXIF 회전 보정은 하지 않는다. 회전 정보도 메타데이터와 함께 지워진다.

## 처리 흐름

1. S3 이벤트로 원본 key를 받고 원본을 읽는다.
2. 백엔드 `POST /internal/v1/image-compactions/upload-urls`에 `{"objectKey": "<원본 key>"}`를 HMAC 서명해서 보낸다.
3. 응답의 `data.uploads[]`(`width`, `uploadUrl`, `headers`)마다 리사이즈한 webp를 presigned URL로 PUT한다.

### 요청 서명

백엔드와 같은 비밀키로 아래 문자열에 HMAC-SHA256 서명한다. 서명 대상 경로는 base URL과 관계없이 항상 `/internal/v1/image-compactions/upload-urls`다.

```
{timestamp}\nPOST\n/internal/v1/image-compactions/upload-urls\n{sha256(body) hex}
```

| 헤더 | 값 |
|---|---|
| `X-Rilog-Lambda-Timestamp` | 현재 Unix 시각(초). 백엔드는 과거 5분, 미래 30초까지만 받는다. |
| `X-Rilog-Lambda-Signature` | `v1=` + HMAC hex |

### 실패 처리

- 백엔드 응답이 2xx가 아니면 예외를 던져 비동기 재시도에 맡긴다. 비밀키 교체 중의 401도 재시도로 회복될 수 있다.
- presigned URL은 `If-None-Match: *` 조건이라 이미 있는 압축본에 PUT하면 412가 온다. 재시도 중 먼저 올라간 너비이므로 성공으로 본다.

## 빌드

Lambda는 Linux arm64에서 실행되므로 sharp를 Linux용으로 설치해야 한다. Windows에서는 PowerShell로 실행한다.

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install --omit=dev --os=linux --cpu=arm64 --libc=glibc
tar.exe -a -cf function.zip index.mjs package.json node_modules
```

`Compress-Archive`는 경로 구분자 문제로 Lambda에서 모듈을 못 찾을 수 있어서 `tar.exe`를 쓴다.
`@aws-sdk/client-s3`는 Node.js Lambda 런타임에 포함되어 있어서 함께 묶지 않는다.

## Lambda 설정

| 항목 | 값 |
|---|---|
| 런타임 | Node.js 24.x |
| 아키텍처 | arm64 |
| 핸들러 | `index.handler` |
| 메모리 | 1536MB (테스트 결과를 보고 조정) |
| 타임아웃 | 30초 |
| Reserved concurrency | 5 |
| 비동기 호출 | 재시도 2회, 이벤트 최대 수명 1시간, 실패 시 SQS destination |

## 환경변수

| 이름 | 값 |
|---|---|
| `RILOG_API_BASE_URL` | prod 백엔드 주소. `https://`로 시작해야 한다. 예: `https://api.example.com` |
| `RILOG_LAMBDA_SECRET` | prod 백엔드의 `INTERNAL_LAMBDA_SECRET`과 같은 값. 32자 이상 |

dev와 prod가 같은 버킷과 root를 쓰므로 Lambda는 prod 백엔드 한 곳만 호출한다. presigned URL은 발급한 서버의 자격 증명으로 동작하므로 dev에서 올린 이미지도 같은 위치에 압축본이 생긴다.
dev 백엔드에는 prod와 다른 `INTERNAL_LAMBDA_SECRET`을 넣는다. 내부 API를 dev에서 확인할 때만 두 환경변수를 잠시 dev 값으로 바꾼다.

비밀키는 아래처럼 만든다.

```bash
openssl rand -hex 32
```

## 실행 역할 권한

기본 CloudWatch Logs 권한(`AWSLambdaBasicExecutionRole`)에 아래를 추가한다. `{bucket}`, `{root}`, `{queue-arn}`은 환경에 맞게 바꾼다.
Lambda에는 S3 쓰기 권한을 주지 않는다. 압축본은 백엔드가 발급한 presigned URL로만 올린다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::{bucket}/{root}/images/raw/*",
        "arn:aws:s3:::{bucket}/{root}/profiles/raw/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::{bucket}",
      "Condition": {
        "StringLike": { "s3:prefix": ["{root}/images/raw/*", "{root}/profiles/raw/*"] }
      }
    },
    {
      "Effect": "Allow",
      "Action": "sqs:SendMessage",
      "Resource": "{queue-arn}"
    }
  ]
}
```

`s3:ListBucket`이 없으면 원본이 지워진 뒤 도착한 이벤트에서 `NoSuchKey` 대신 `AccessDenied`가 와서 재시도로 이어진다.

presigned URL은 발급한 백엔드의 권한으로 동작한다. prod 백엔드 실행 역할에 `{root}/images/compact/*`, `{root}/profiles/compact/*`에 대한 `s3:PutObject`가 있어야 한다.

## S3 이벤트 알림

버킷 > 속성 > 이벤트 알림에서 접두사마다 하나씩 만든다.

| 항목 | 값 |
|---|---|
| 접두사 | `{root}/images/raw/`, `{root}/profiles/raw/` |
| 접미사 | 비움 |
| 이벤트 유형 | 모든 객체 생성 이벤트(`s3:ObjectCreated:*`) |
| 대상 | 이 Lambda 함수 |

## 배포 순서

S3 쓰기 권한을 presigned URL로 옮기는 동안 압축이 끊기지 않게 아래 순서를 지킨다.

1. 백엔드 dev, prod에 각각 `INTERNAL_LAMBDA_SECRET`을 넣고 배포한다.
2. prod 백엔드 실행 역할에 `compact/` 쓰기 권한이 있는지 확인한다.
3. Lambda에 `RILOG_API_BASE_URL`, `RILOG_LAMBDA_SECRET`을 넣고 새 코드를 배포한다.
4. 원본을 하나 올려 압축본이 생기는지 확인한다.
5. Lambda 실행 역할에서 `s3:PutObject`를 제거한다.

## 로그

CloudWatch Logs에 JSON 한 줄로 남긴다.

- `image_compact_compacted`: 변환 완료 (`key`, `sourceWidth`, `widths`)
- `image_compact_upload_exists`: 이미 있는 압축본이라 412를 받음 (`width`)
- `image_compact_skip`: 건너뜀 (`reason`: `not_original_key`, `unsupported_extension`, `animated_image`, `source_not_found`)

## 아직 하지 않은 것

- 압축본에는 `status` 태그를 붙이지 않는다. 원본이 lifecycle로 지워질 때 `compact/{id}/`도 함께 지우는 처리는 따로 만들어야 한다.
- 백엔드는 아직 `raw/{id}/original.{ext}` 경로로 원본 업로드 URL을 발급하지 않고, 프로필 업로드 API도 없다.
