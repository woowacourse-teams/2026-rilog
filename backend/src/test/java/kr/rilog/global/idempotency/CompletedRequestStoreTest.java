package kr.rilog.global.idempotency;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CompletedRequestStoreTest {

    private final CompletedRequestStore store = new CompletedRequestStore();

    @Test
    @DisplayName("같은 키는 한 번만 실행하고 저장된 응답을 반환한다.")
    void executeOnceForSameKey() {
        RequestKey key = randomKey();
        AtomicInteger executionCount = new AtomicInteger();
        Supplier<Object> execution = () -> {
            executionCount.incrementAndGet();
            return new Object();
        };

        Object first = store.getOrExecute(key, execution);
        Object second = store.getOrExecute(key, execution);

        assertThat(second).isSameAs(first);
        assertThat(executionCount).hasValue(1);
    }

    @Test
    @DisplayName("키가 다르면 응답을 공유하지 않는다.")
    void separateResponsesByKey() {
        Object first = store.getOrExecute(randomKey(), Object::new);
        Object second = store.getOrExecute(randomKey(), Object::new);

        assertThat(second).isNotSameAs(first);
    }

    @Test
    @DisplayName("실행이 실패하면 예외를 그대로 던지고 저장하지 않는다.")
    void doNotStoreFailedExecution() {
        RequestKey key = randomKey();
        IllegalStateException failure = new IllegalStateException("처리 실패");
        Object response = new Object();

        assertThatThrownBy(() -> store.getOrExecute(key, () -> {
            throw failure;
        })).isSameAs(failure);

        assertThat(store.getOrExecute(key, () -> response)).isSameAs(response);
    }

    private RequestKey randomKey() {
        return new RequestKey("operation", 7L, new IdempotencyKey(UUID.randomUUID()));
    }
}
