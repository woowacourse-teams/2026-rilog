FROM node:24.19.0-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
# glibc malloc의 arena(메모리 풀) 수를 2개로 묶는다. 기본값은 CPU 코어 수 × 8개라, sharp가 쓰는 스레드마다
# 따로 arena를 만들고 해제한 메모리를 각자 붙잡고 있어 잔류 메모리가 쌓인다(--cpus 제한으로는 줄지 않는다).
# 이 설정 없이 원본 줄이기 + 두 대기열 구조로 10분 연속 처리하면 512MiB에서 21초 만에 OOM이 났고,
# 설정하면 10분 동안 최고 292MiB였다(docs/reports/2026-11-05-image-transform-queue-experiment.md 9장, ADR 0026).
ENV MALLOC_ARENA_MAX=2

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src ./src
USER node
EXPOSE 8000
CMD ["node", "src/server.mjs"]
