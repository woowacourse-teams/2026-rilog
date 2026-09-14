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

응답의 `X-Request-ID`로 한 요청의 로그를 조회한다.

```sql
fields @timestamp, level, service, environment, requestId, event, message, stack_trace
| filter requestId = "요청 ID"
| sort @timestamp asc
```

서버 오류 이벤트를 최신순으로 확인한다.

```sql
fields @timestamp, level, requestId, event, errorCode, httpStatus, message
| filter level = "ERROR" and ispresent(event)
| sort @timestamp desc
| limit 50
```

S3 비동기 실패를 원래 요청과 연결해 확인한다.

```sql
fields @timestamp, requestId, event, bucket, key, tagStatus, message, stack_trace
| filter event = "s3_object_tagging_failed"
| sort @timestamp desc
| limit 50
```

OAuth 로그인 완료 이벤트를 온보딩 상태별로 확인한다.

```sql
fields @timestamp, requestId, provider, userId, onboardingStatus
| filter event = "oauth_login_completed"
| sort @timestamp desc
| limit 50
```

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
