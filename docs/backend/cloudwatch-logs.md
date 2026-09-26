# Backend CloudWatch Logs Guide

이 문서는 백엔드 컨테이너 로그를 CloudWatch Logs에 수집하고 `requestId`, `event`, `level`로 조회하는 운영 기준을 정의한다. 메트릭, 대시보드, 알람은 모니터링 담당 범위로 둔다.

## 수집 방식

백엔드 애플리케이션은 `dev`, `prod` 프로필에서 한 줄 JSON 로그를 stdout으로 출력한다. EC2 서버의 Docker Compose `app` 서비스는 Docker `awslogs` 로그 드라이버를 사용해 해당 stdout 로그를 CloudWatch Logs로 전송한다.

GitHub Actions 백엔드 배포 워크플로우는 기존처럼 EC2의 `/home/ubuntu/deploy.sh`를 실행한다. `deploy.sh`는 `docker compose pull app`, `docker compose up -d --no-deps app` 흐름을 유지하고, CloudWatch Logs 수집 옵션은 서버의 `/home/ubuntu/docker-compose.yml`에 설정한다.

| 항목 | dev | prod |
| --- | --- | --- |
| 로그 그룹 | `/rilog/backend/dev` | `/rilog/backend/prod` |
| 보관 기간 | 7일 | 30일 |
| 로그 스트림 tag | `dev/{{.Name}}/{{.ID}}` | `prod/{{.Name}}/{{.ID}}` |
| 앱 프로필 | `dev` | `prod` |

로그 그룹은 환경별로 하나만 사용하고, 로그 스트림은 컨테이너 이름과 컨테이너 ID를 포함해 컨테이너 재생성 이후에도 구분된다. JSON 로그는 앱에서 한 줄로 출력하며, CloudWatch 수집 단계에서 multiline 병합 옵션을 사용하지 않는다.

위 값은 운영 기준이다. EC2 Compose, AWS 로그 그룹과 실제 보관 기간은 저장소 밖 설정이므로 배포 환경에서 별도로 확인한다. 로깅 고도화 구현으로 이 설정을 변경하거나 적용하지 않는다.

## 서버 사전 조건

CloudWatch Logs 로그 그룹은 컨테이너 배포 전에 먼저 생성한다.

- dev: `/rilog/backend/dev`, 보관 기간 7일
- prod: `/rilog/backend/prod`, 보관 기간 30일

`awslogs-create-group`은 `"false"`로 둔다. 따라서 Docker가 로그 그룹을 자동 생성하지 않으며, 로그 그룹 생성과 보관 기간 설정은 AWS Console 또는 운영자가 사용하는 AWS CLI에서 처리한다.

EC2 인스턴스 프로필 또는 Docker 데몬이 사용할 AWS 자격 증명에는 다음 권한이 필요하다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:<region>:<account-id>:log-group:/rilog/backend/*:*"
    }
  ]
}
```

로그 그룹을 서버에서 자동 생성하도록 바꾸는 경우에만 `awslogs-create-group`을 `"true"`로 변경하고 `logs:CreateLogGroup` 권한을 추가한다.

## Docker Compose 설정

EC2의 `/home/ubuntu/docker-compose.yml`에서 `app` 서비스에 다음 logging 블록을 추가한다. 기존 `image`, `environment`, `env_file`, `ports`, `networks` 설정은 유지한다.

dev:

```yaml
services:
  app:
    logging:
      driver: awslogs
      options:
        awslogs-region: ap-northeast-2
        awslogs-group: /rilog/backend/dev
        awslogs-create-group: "false"
        tag: "dev/{{.Name}}/{{.ID}}"
        awslogs-force-flush-interval-seconds: "5"
        awslogs-max-buffered-events: "4096"
```

prod:

```yaml
services:
  app:
    logging:
      driver: awslogs
      options:
        awslogs-region: ap-northeast-2
        awslogs-group: /rilog/backend/prod
        awslogs-create-group: "false"
        tag: "prod/{{.Name}}/{{.ID}}"
        awslogs-force-flush-interval-seconds: "5"
        awslogs-max-buffered-events: "4096"
```

설정 후 문법을 확인하고 컨테이너를 재생성해야 로그 드라이버가 적용된다.

```bash
cd /home/ubuntu
docker compose config
docker compose up -d --no-deps --force-recreate app
docker inspect rilog-app --format '{{.HostConfig.LogConfig.Type}}'
```

마지막 명령의 출력이 `awslogs`이면 컨테이너 로그 드라이버가 적용된 것이다.

## 조회 쿼리

응답의 `X-Request-ID`로 HTTP 처리와 이후 비동기 작업을 시간순으로 연결한다. 비동기 처리가 늦어질 수 있으므로 조회 시간 범위를 충분히 잡는다.

```sql
fields @timestamp, level, requestId, event, method, path, provider, operation, bucket, key, tagStatus, message, stack_trace
| filter requestId = "요청 ID"
| sort @timestamp asc
```

서버 오류 이벤트를 최신순으로 확인한다.

```sql
fields @timestamp, level, requestId, event, errorCode, httpStatus, method, path, provider, operation, failureType, externalStatus, message
| filter level = "ERROR" and ispresent(event)
| sort @timestamp desc
| limit 50
```

리소스 404의 실제 경로와 반복 빈도를 확인한다. 잘못된 API 경로와 브라우저/스캐너의 자산 요청을 경로를 보기 전에 단정하지 않는다.

```sql
filter event = "http_request_exception" and errorCode = "STATIC_RESOURCE_NOT_FOUND"
| stats count(*) as requests by method, path
| sort requests desc
| limit 50
```

GitHub 실패를 작업과 원인별로 집계한다. `externalStatus`는 없을 수도 있으므로 원인별 집계는 그 필드 유무에 의존하지 않는다.

```sql
filter event = "http_request_exception" and provider = "GITHUB"
| stats count(*) as failures by operation, failureType
| sort failures desc
```

개별 GitHub 실패의 요청과 외부 상태를 확인한다.

```sql
fields @timestamp, requestId, method, path, operation, failureType, externalStatus, durationMs, stack_trace
| filter event = "http_request_exception" and provider = "GITHUB"
| sort @timestamp desc
| limit 50
```

Presigned URL 발급 실패만 조회한다. 브라우저의 S3 PUT 실패를 조회하는 쿼리가 아니다.

```sql
fields @timestamp, requestId, method, path, provider, operation, failureType, durationMs, stack_trace
| filter event = "http_request_exception"
    and provider = "S3" and operation = "presign_put_object"
| sort @timestamp desc
| limit 50
```

S3 비동기 실패와 AWS 진단 정보를 확인한다. 실패 목록 자체가 미복구 작업 목록은 아니다.

```sql
fields @timestamp, requestId, bucket, key, tagStatus, durationMs, externalStatus, awsErrorCode, awsRequestId, stack_trace
| filter event = "s3_object_tagging_failed"
| sort @timestamp desc
| limit 50
```

대상 객체의 실패 이력을 확인한다. 성공 로그는 남기지 않으므로 이력만으로 현재 상태를 판정하지 않는다. 이후 다른 요청에서 태그가 바뀔 수 있으므로 복구 판단 시 `requestId` 하나로만 제한하지 않는다.

```sql
fields @timestamp, requestId, event, bucket, key, tagStatus, durationMs, externalStatus, awsErrorCode, awsRequestId
| filter event = "s3_object_tagging_failed"
    and bucket = "대상 버킷" and key = "대상 객체 키"
| sort @timestamp asc
```

OAuth 로그인 완료 이벤트를 온보딩 상태별로 확인한다.

```sql
fields @timestamp, requestId, provider, userId, onboardingStatus
| filter event = "oauth_login_completed"
| sort @timestamp desc
| limit 50
```

## S3 수동 복구

이 절차는 운영자가 실패를 확인하고 현재 의도에 맞게 태그를 복구하기 위한 기준이다. 자동 재시도, outbox 또는 복구 도구를 구현한 것은 아니다.

1. `s3_object_tagging_failed`에서 환경, `bucket`, `key`, `requestId`, `tagStatus`, 시각 및 확인 가능한 AWS 진단 정보를 수집한다. 버킷과 환경을 먼저 대조한다.
2. 현재 DB의 게시글/블로그/프로필 등 해당 객체의 참조와 현재 S3 객체 존재 여부 및 태그를 조회한다. 이후 변경 요청과 운영 처리 기록도 확인하며, 추가 실패 로그가 없다는 이유로 복구됐다고 판단하지 않는다.
3. **현재 DB 참조와 서비스 정책**으로 필요한 태그를 판단한다. 오래된 실패 로그의 `tagStatus`를 그대로 재적용하지 않는다. 이미 삭제된 객체는 태깅만으로 복구할 수 없고, 이미 올바른 태그라면 중복 변경하지 않는다.
4. 권한이 있는 운영자가 필요한 경우에만 태그를 변경한다. 전체 tag set을 덮어쓸 수 있으므로 기존의 다른 태그를 보존해야 하는지 확인한다. 조사 중 새 변경이 있었다면 변경 직전에 상태를 다시 확인한다.
5. 실제 S3 태그와 DB 참조를 재확인하고 담당자, 처리 시각, 환경/대상, 판단 근거, 변경 전후 상태 및 결과를 운영 기록에 남긴다. 성공 로그 대신 재조회한 상태를 복구 확인 근거로 사용한다.

## 운영 확인과 한계

- 실제 TEMPORARY 객체 삭제 조건, 수명주기 규칙과 유예 기간을 확인한다. 삭제 전 조사/복구가 가능한지 확인하며 유예 시간을 추정하지 않는다.
- 실패 확인 담당자와 확인 주기를 정하고, 기존 모니터링 담당자와 `s3_object_tagging_failed`/서버 ERROR 알림 연결 여부를 확인한다. 이 문서 작성이 알람 생성이나 담당자 지정의 완료를 뜻하지 않는다.
- 로그 보관 기간과 조회 권한을 확인한다. dev 7일/prod 30일 기준이 실제 로그 그룹에 적용됐는지 운영에서 검증한다.
- AFTER_COMMIT 이후 프로세스 종료, 비동기 실행 전 작업 유실, 로그 전송 실패에는 결과 로그 자체가 없을 수 있다. **로그는 복구 큐가 아니며 실패 로그가 없다고 전체 작업 성공을 보장하지 않는다.**
- S3 전체 장애 이력과 별개로 권한, 네트워크, 설정 또는 객체 상태 문제로 개별 호출은 실패할 수 있다. 로그만으로 삭제 전 복구를 보장할 수 없거나 미처리 누적/작업 유실이 허용되지 않으면 영속 작업 저장, 재조정 또는 outbox를 후속 설계한다.

## 검증 범위

로컬 `./gradlew build`는 전체 테스트와 빌드를 포함한다. 테스트는 공통 HTTP 필드/인증 로그 제외, 외부 실패 문맥, 민감정보를 제거한 stack 출력, S3 결과 및 requestId 전파와 dev/prod의 기존 JSON 설정을 검증한다. 현재 CI의 `build -x test` 성공은 테스트 통과 근거로 대체하지 않는다.

외부 호출은 mock으로 검증한다. 배포 후에는 실제 JSON 필드와 숫자 타입, CloudWatch 수집/조회 쿼리, 로그 중복 여부를 확인한다. 운영 AWS/GitHub 장애를 유발하거나 실제 S3 객체를 변경하는 검증은 이 작업에 포함하지 않는다.

## 중복 수집 방지

백엔드 컨테이너 로그는 Docker `awslogs` 드라이버 한 곳에서만 CloudWatch로 보낸다. 같은 파일이나 컨테이너 stdout을 CloudWatch Agent가 추가로 수집하지 않는다.

중복이 의심되면 같은 `requestId`, `event`, `@message`가 동일 시각대에 두 번 이상 들어오는지 확인한다.

```sql
fields @timestamp, @logStream, requestId, event, message
| filter requestId = "요청 ID"
| sort @timestamp asc
```

## 롤백

CloudWatch 로그 전송 문제로 배포가 막히면 다음 중 하나로 되돌린다.

- 로그 그룹 권한이나 리전 오류: 인스턴스 프로필, `awslogs-region`, `awslogs-group`을 수정한 뒤 재배포한다.
- 로그 그룹 미생성 오류: 로그 그룹을 수동 생성하거나 임시로 `awslogs-create-group`을 `"true"`로 바꾸고 필요한 권한을 부여한다.
- Docker `awslogs` 드라이버 문제: `/home/ubuntu/docker-compose.yml`의 `app.logging` 블록을 제거하고 컨테이너를 재생성해 서비스 복구를 우선한다.

롤백 후에도 앱 로그 자체는 stdout에 계속 출력되어야 하며, 애플리케이션의 JSON 로그 설정은 변경하지 않는다.
