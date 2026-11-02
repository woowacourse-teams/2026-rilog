package kr.rilog.global.idempotency;

import java.util.Objects;
import java.util.UUID;

public record IdempotencyKey(
        UUID value
) {

    public IdempotencyKey{
        Objects.requireNonNull(value, "멱등키가 존재하지 않습니다.");
    }

    public static IdempotencyKey from(String value) {
        return new IdempotencyKey(UUID.fromString(value));
    }

}
