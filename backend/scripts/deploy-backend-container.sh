#!/usr/bin/env bash

set -euo pipefail

readonly DEFAULT_CONTAINER_PORT=8080

is_dry_run() {
  [[ "${DRY_RUN:-false}" == "true" ]]
}

print_command() {
  printf '+'
  for argument in "$@"; do
    printf ' %s' "${argument}"
  done
  printf '\n'
}

run() {
  if is_dry_run; then
    print_command "$@"
    return
  fi

  "$@"
}

run_optional() {
  if is_dry_run; then
    print_command "$@"
    return
  fi

  "$@" >/dev/null 2>&1 || true
}

require_env() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 64
  fi
}

login_to_registry_if_configured() {
  if [[ -z "${DOCKER_PASSWORD:-}" ]]; then
    return
  fi

  if is_dry_run; then
    print_command docker login --username "${DOCKER_USER_NAME}" --password-stdin
    return
  fi

  printf '%s' "${DOCKER_PASSWORD}" |
    docker login --username "${DOCKER_USER_NAME}" --password-stdin
}

configure_log_retention_if_possible() {
  if [[ -z "${RILOG_LOG_RETENTION_DAYS:-}" ]]; then
    return
  fi

  if ! is_dry_run && ! command -v aws >/dev/null 2>&1; then
    echo "aws CLI not found; skip CloudWatch Logs retention policy setup." >&2
    return
  fi

  if [[ "${RILOG_LOG_CREATE_GROUP}" == "true" ]]; then
    run_optional aws logs create-log-group --log-group-name "${RILOG_LOG_GROUP}"
  fi

  run aws logs put-retention-policy \
    --log-group-name "${RILOG_LOG_GROUP}" \
    --retention-in-days "${RILOG_LOG_RETENTION_DAYS}"
}

append_env_file_if_present() {
  local explicit_env_file="${RILOG_ENV_FILE:-}"
  local candidates=()

  if [[ -n "${explicit_env_file}" ]]; then
    candidates=("${explicit_env_file}")
  else
    candidates=(
      "/home/ubuntu/rilog-backend/${RILOG_ENV}.env"
      "/home/ubuntu/rilog-backend/.env"
      "/home/ubuntu/${RILOG_ENV}.env"
      "/home/ubuntu/.env"
    )
  fi

  for env_file in "${candidates[@]}"; do
    if [[ -f "${env_file}" ]]; then
      docker_args+=(--env-file "${env_file}")
      return
    fi
  done

  if [[ -n "${explicit_env_file}" ]]; then
    echo "Configured RILOG_ENV_FILE does not exist: ${explicit_env_file}" >&2
    exit 66
  fi
}

require_env DOCKER_USER_NAME
require_env DOCKER_IMAGE

RILOG_ENV="${RILOG_ENV:-prod}"
SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-${RILOG_ENV}}"
DOCKER_TAG="${DOCKER_TAG:-${RILOG_ENV}}"
RILOG_CONTAINER_NAME="${RILOG_CONTAINER_NAME:-rilog-backend-${RILOG_ENV}}"
RILOG_HOST_PORT="${RILOG_HOST_PORT:-8080}"
RILOG_CONTAINER_PORT="${RILOG_CONTAINER_PORT:-${DEFAULT_CONTAINER_PORT}}"
RILOG_LOG_GROUP="${RILOG_LOG_GROUP:-/rilog/backend/${RILOG_ENV}}"
RILOG_LOG_CREATE_GROUP="${RILOG_LOG_CREATE_GROUP:-false}"
RILOG_LOG_FORCE_FLUSH_INTERVAL_SECONDS="${RILOG_LOG_FORCE_FLUSH_INTERVAL_SECONDS:-5}"
RILOG_LOG_MAX_BUFFERED_EVENTS="${RILOG_LOG_MAX_BUFFERED_EVENTS:-4096}"

if [[ -z "${RILOG_LOG_TAG:-}" ]]; then
  RILOG_LOG_TAG="${RILOG_ENV}/{{.Name}}/{{.ID}}"
fi

image="${DOCKER_USER_NAME}/${DOCKER_IMAGE}:${DOCKER_TAG}"

login_to_registry_if_configured
configure_log_retention_if_possible

run docker pull "${image}"
run_optional docker stop "${RILOG_CONTAINER_NAME}"
run_optional docker rm "${RILOG_CONTAINER_NAME}"

docker_args=(
  docker run
  -d
  --name "${RILOG_CONTAINER_NAME}"
  --restart unless-stopped
  -p "${RILOG_HOST_PORT}:${RILOG_CONTAINER_PORT}"
  -e "SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE}"
  --log-driver awslogs
  --log-opt "awslogs-group=${RILOG_LOG_GROUP}"
  --log-opt "awslogs-create-group=${RILOG_LOG_CREATE_GROUP}"
  --log-opt "tag=${RILOG_LOG_TAG}"
  --log-opt "awslogs-force-flush-interval-seconds=${RILOG_LOG_FORCE_FLUSH_INTERVAL_SECONDS}"
  --log-opt "awslogs-max-buffered-events=${RILOG_LOG_MAX_BUFFERED_EVENTS}"
)

if [[ -n "${AWS_REGION:-}" ]]; then
  docker_args+=(--log-opt "awslogs-region=${AWS_REGION}")
fi

append_env_file_if_present

docker_args+=("${image}")

run "${docker_args[@]}"
