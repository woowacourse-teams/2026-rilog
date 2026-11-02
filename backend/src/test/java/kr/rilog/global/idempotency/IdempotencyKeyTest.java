package kr.rilog.global.idempotency;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdempotencyKeyTest {

    @Test
    @DisplayName("UUID 형식의 문자열로 멱등키를 생성한다.")
    void createFromUuidString() {
        UUID value = UUID.randomUUID();

        IdempotencyKey key = IdempotencyKey.from(value.toString());

        assertThat(key.value()).isEqualTo(value);
    }

    @Test
    @DisplayName("같은 UUID로 만든 멱등키는 같은 키로 취급한다.")
    void equalsByValue() {
        UUID value = UUID.randomUUID();

        assertThat(IdempotencyKey.from(value.toString())).isEqualTo(new IdempotencyKey(value));
    }

    @Test
    @DisplayName("UUID 형식이 아닌 문자열은 거부한다.")
    void rejectInvalidUuidString() {
        assertThatThrownBy(() -> IdempotencyKey.from("not-a-uuid"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("값이 없으면 생성할 수 없다.")
    void rejectNullValue() {
        assertThatThrownBy(() -> new IdempotencyKey(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("멱등키가 존재하지 않습니다.");
    }
}
