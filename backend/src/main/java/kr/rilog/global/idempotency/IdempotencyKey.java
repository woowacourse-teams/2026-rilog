package kr.rilog.global.idempotency;

import kr.rilog.global.idempotency.exception.IdempotencyException;

import java.util.Objects;
import java.util.UUID;

import static kr.rilog.global.idempotency.exception.IdempotencyErrorInformation.INVALID_IDEMPOTENCY_KEY;

public record IdempotencyKey(
        UUID value
) {

    public IdempotencyKey{
        Objects.requireNonNull(value, "멱등키가 존재하지 않습니다.");
    }

    public static IdempotencyKey from(String value) {
        try {
            return new IdempotencyKey(UUID.fromString(value));
        } catch (IllegalArgumentException exception) {
            throw new IdempotencyException(INVALID_IDEMPOTENCY_KEY);
        }
    }

}
