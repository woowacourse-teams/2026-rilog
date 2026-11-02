package kr.rilog.global.idempotency;

public record RequestKey(
        String operation,
        Long requesterId,
        IdempotencyKey idempotencyKey
) {
}
