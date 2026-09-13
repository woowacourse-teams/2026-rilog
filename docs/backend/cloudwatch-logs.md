# Backend CloudWatch Logs Guide

이 문서는 백엔드 컨테이너 로그를 CloudWatch Logs에 수집하고 `requestId`, `event`, `level`로 조회하는 운영 기준을 정의한다. 메트릭, 대시보드, 알람은 모니터링 담당 범위로 둔다.

## 수집 방식

백엔드 컨테이너는 Docker `awslogs` 로그 드라이버를 사용한다. GitHub Actions의 백엔드 배포 워크플로우는 `backend/scripts/deploy-backend-container.sh`를 실행하고, 이 스크립트가 `docker run`에 다음 로그 옵션을 전달한다.

| 항목 | dev | prod |
| --- | --- | --- |
| 로그 그룹 | `/rilog/backend/dev` | `/rilog/backend/prod` |
| 보관 기간 | 7일 | 30일 |
| 로그 스트림 tag | `dev/{{.Name}}/{{.ID}}` | `prod/{{.Name}}/{{.ID}}` |
| 앱 프로필 | `dev` | `prod` |

로그 그룹은 환경별로 하나만 사용하고, 로그 스트림은 컨테이너 이름과 컨테이너 ID를 포함해 컨테이너 재생성 이후에도 구분된다. JSON 로그는 앱에서 한 줄로 출력하며, CloudWatch 수집 단계에서 multiline 병합 옵션을 사용하지 않는다.

## 서버 사전 조건

EC2 인스턴스 프로필 또는 Docker 데몬이 사용할 AWS 자격 증명에는 다음 권한이 필요하다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:DescribeLogGroups",
        "logs:PutRetentionPolicy"
      ],
      "Resource": "arn:aws:logs:<region>:<account-id>:log-group:/rilog/backend/*"
    },
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

로그 그룹을 배포 스크립트에서 자동 생성하려면 `RILOG_LOG_CREATE_GROUP=true`를 설정하고 로그 그룹 ARN에 대한 `logs:CreateLogGroup` 권한을 추가한다. 기본값은 `false`이며, 기본 운영 방식은 모니터링 담당이 로그 그룹을 먼저 생성하고 보관 기간을 확인하는 것이다.

## 배포 설정

워크플로우는 배포 시 다음 환경값을 전달한다.

| 변수 | 설명 |
| --- | --- |
| `DOCKER_USER_NAME`, `DOCKER_IMAGE`, `DOCKER_TAG` | 배포할 Docker 이미지 |
| `AWS_REGION` | CloudWatch Logs 리전. 비어 있으면 EC2 메타데이터/데몬 설정에 맡긴다 |
| `RILOG_ENV` | `dev` 또는 `prod` |
| `RILOG_CONTAINER_NAME` | 컨테이너 이름 |
| `RILOG_LOG_GROUP` | CloudWatch Logs 로그 그룹 |
| `RILOG_LOG_RETENTION_DAYS` | 보관 기간 |
| `RILOG_ENV_FILE` | 선택값. 지정하면 해당 env file을 컨테이너에 전달한다 |

`RILOG_ENV_FILE`을 지정하지 않으면 스크립트는 `/home/ubuntu/rilog-backend/{env}.env`, `/home/ubuntu/rilog-backend/.env`, `/home/ubuntu/{env}.env`, `/home/ubuntu/.env` 순서로 존재하는 파일을 찾아 사용한다. 어떤 파일도 없으면 env file 없이 컨테이너를 실행하므로, 서버 환경변수 또는 명시적인 env file이 준비되어 있어야 한다.

스크립트는 `DRY_RUN=true`로 실행하면 실제 Docker/AWS 명령을 실행하지 않고 명령만 출력한다.

```bash
cd backend
DRY_RUN=true \
DOCKER_USER_NAME=rilog \
DOCKER_IMAGE=backend \
DOCKER_TAG=prod \
AWS_REGION=ap-northeast-2 \
RILOG_ENV=prod \
scripts/deploy-backend-container.sh
```

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

- 로그 그룹 권한이나 리전 오류: 인스턴스 프로필과 `AWS_REGION`, `RILOG_LOG_GROUP`을 수정한 뒤 재배포한다.
- 로그 그룹 미생성 오류: 로그 그룹을 수동 생성하거나 `RILOG_LOG_CREATE_GROUP=true`와 필요한 권한을 임시로 부여한다.
- Docker `awslogs` 드라이버 문제: 배포 스크립트의 로그 옵션을 `json-file` 드라이버로 되돌려 서비스 복구를 우선하고, CloudWatch 설정을 별도 수정한다.

롤백 후에도 앱 로그 자체는 stdout에 계속 출력되어야 하며, 애플리케이션의 JSON 로그 설정은 변경하지 않는다.
