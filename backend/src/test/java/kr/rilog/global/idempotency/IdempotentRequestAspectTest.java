package kr.rilog.global.idempotency;

import kr.rilog.domain.auth.annotation.LoginUserId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdempotentRequestAspectTest {

    private static final Long REQUESTER_ID = 7L;
    private static final Long OTHER_REQUESTER_ID = 8L;
    private static final int CONCURRENT_REQUESTS = 8;

    private final FakeController target = new FakeController();
    private final FakeController controller = proxied(target);

    @Test
    @DisplayName("같은 사용자가 같은 키로 다시 요청하면 기존 응답을 반환하고 메서드를 다시 실행하지 않는다.")
    void reuseResponseOfCompletedRequest() {
        IdempotencyKey key = randomKey();

        Object first = controller.create(REQUESTER_ID, key);
        Object second = controller.create(REQUESTER_ID, key);

        assertThat(second).isSameAs(first);
        assertThat(target.createCount).hasValue(1);
    }

    @Test
    @DisplayName("같은 키의 동시 요청은 한 번만 실행하고 모두 같은 응답을 받는다.")
    void executeOnceForConcurrentRequests() throws Exception {
        IdempotencyKey key = randomKey();
        CountDownLatch ready = new CountDownLatch(CONCURRENT_REQUESTS);

        try (ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_REQUESTS)) {
            List<Future<Object>> responses = new ArrayList<>();
            for (int request = 0; request < CONCURRENT_REQUESTS; request++) {
                responses.add(executor.submit(() -> {
                    ready.countDown();
                    return controller.createAfter(ready, REQUESTER_ID, key);
                }));
            }

            Object first = responses.getFirst().get(5, TimeUnit.SECONDS);
            for (Future<Object> response : responses) {
                assertThat(response.get(5, TimeUnit.SECONDS)).isSameAs(first);
            }
        }
        assertThat(target.createCount).hasValue(1);
    }

    @Test
    @DisplayName("실행이 실패하면 응답을 저장하지 않아 같은 키로 재시도할 수 있다.")
    void retryAfterFailure() {
        IdempotencyKey key = randomKey();
        IllegalStateException failure = new IllegalStateException("처리 실패");

        assertThatThrownBy(() -> controller.createFailingOnce(failure, REQUESTER_ID, key))
                .isSameAs(failure);
        Object retried = controller.createFailingOnce(failure, REQUESTER_ID, key);

        assertThat(retried).isNotNull();
        assertThat(target.createCount).hasValue(2);
    }

    @Test
    @DisplayName("checked 예외도 감싸지 않고 원래 예외 그대로 던진다.")
    void rethrowCheckedExceptionAsIs() {
        IOException failure = new IOException("처리 실패");

        assertThatThrownBy(() -> controller.createThrowingChecked(failure, REQUESTER_ID, randomKey()))
                .isSameAs(failure);
    }

    @Test
    @DisplayName("같은 키라도 사용자가 다르면 응답을 공유하지 않는다.")
    void separateResponsesByRequester() {
        IdempotencyKey key = randomKey();

        Object first = controller.create(REQUESTER_ID, key);
        Object other = controller.create(OTHER_REQUESTER_ID, key);

        assertThat(other).isNotSameAs(first);
        assertThat(target.createCount).hasValue(2);
    }

    @Test
    @DisplayName("같은 사용자의 같은 키라도 API가 다르면 응답을 공유하지 않는다.")
    void separateResponsesByOperation() {
        IdempotencyKey key = randomKey();

        Object created = controller.create(REQUESTER_ID, key);
        Object other = controller.createOther(REQUESTER_ID, key);

        assertThat(other).isNotSameAs(created);
    }

    @Test
    @DisplayName("키가 다르면 새로운 요청으로 실행한다.")
    void separateResponsesByKey() {
        Object first = controller.create(REQUESTER_ID, randomKey());
        Object second = controller.create(REQUESTER_ID, randomKey());

        assertThat(second).isNotSameAs(first);
        assertThat(target.createCount).hasValue(2);
    }

    @Test
    @DisplayName("키가 없으면 요청마다 실행한다.")
    void proceedEveryTimeWithoutKey() {
        controller.create(REQUESTER_ID, null);
        controller.create(REQUESTER_ID, null);

        assertThat(target.createCount).hasValue(2);
    }

    @Test
    @DisplayName("파라미터 순서와 상관없이 키와 사용자를 찾는다.")
    void findArgumentsRegardlessOfParameterOrder() {
        IdempotencyKey key = randomKey();

        Object first = controller.createWithKeyFirst(key, "payload", REQUESTER_ID);
        Object second = controller.createWithKeyFirst(key, "payload", REQUESTER_ID);
        Object other = controller.createWithKeyFirst(key, "payload", OTHER_REQUESTER_ID);

        assertThat(second).isSameAs(first);
        assertThat(other).isNotSameAs(first);
    }

    @Test
    @DisplayName("IdempotentRequest가 없는 메서드는 키가 있어도 응답을 재사용하지 않는다.")
    void ignoreMethodWithoutAnnotation() {
        IdempotencyKey key = randomKey();

        Object first = controller.createWithoutAnnotation(REQUESTER_ID, key);
        Object second = controller.createWithoutAnnotation(REQUESTER_ID, key);

        assertThat(second).isNotSameAs(first);
    }

    @Test
    @DisplayName("IdempotencyKey 파라미터를 선언하지 않으면 메서드를 실행하지 않고 실패한다.")
    void failWhenIdempotencyKeyIsNotDeclared() {
        assertThatThrownBy(() -> controller.createWithoutKeyParameter(REQUESTER_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("IdempotencyKey");

        assertThat(target.createCount).hasValue(0);
    }

    @Test
    @DisplayName("LoginUserId 파라미터를 선언하지 않으면 메서드를 실행하지 않고 실패한다.")
    void failWhenRequesterIsNotDeclared() {
        assertThatThrownBy(() -> controller.createWithoutRequesterParameter(randomKey()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("LoginUserId");

        assertThat(target.createCount).hasValue(0);
    }

    private IdempotencyKey randomKey() {
        return new IdempotencyKey(UUID.randomUUID());
    }

    private FakeController proxied(FakeController controller) {
        AspectJProxyFactory factory = new AspectJProxyFactory(controller);
        factory.setProxyTargetClass(true);
        factory.addAspect(new IdempotentRequestAspect(new CompletedRequestStore()));
        return factory.getProxy();
    }

    static class FakeController {

        private final AtomicInteger createCount = new AtomicInteger();

        @IdempotentRequest
        public Object create(@LoginUserId Long requesterId, IdempotencyKey idempotencyKey) {
            return newResponse();
        }

        @IdempotentRequest
        public Object createOther(@LoginUserId Long requesterId, IdempotencyKey idempotencyKey) {
            return newResponse();
        }

        // 모든 요청이 출발한 뒤에 끝나도록 해서 다른 요청이 처리 중에 도착하게 한다.
        @IdempotentRequest
        public Object createAfter(
                CountDownLatch ready,
                @LoginUserId Long requesterId,
                IdempotencyKey idempotencyKey
        ) throws InterruptedException {
            ready.await(5, TimeUnit.SECONDS);
            return newResponse();
        }

        @IdempotentRequest
        public Object createFailingOnce(
                RuntimeException failure,
                @LoginUserId Long requesterId,
                IdempotencyKey idempotencyKey
        ) {
            if (createCount.getAndIncrement() == 0) {
                throw failure;
            }
            return new Object();
        }

        @IdempotentRequest
        public Object createThrowingChecked(
                IOException failure,
                @LoginUserId Long requesterId,
                IdempotencyKey idempotencyKey
        ) throws IOException {
            throw failure;
        }

        @IdempotentRequest
        public Object createWithKeyFirst(
                IdempotencyKey idempotencyKey,
                String payload,
                @LoginUserId Long requesterId
        ) {
            return newResponse();
        }

        public Object createWithoutAnnotation(@LoginUserId Long requesterId, IdempotencyKey idempotencyKey) {
            return newResponse();
        }

        @IdempotentRequest
        public Object createWithoutKeyParameter(@LoginUserId Long requesterId) {
            return newResponse();
        }

        @IdempotentRequest
        public Object createWithoutRequesterParameter(IdempotencyKey idempotencyKey) {
            return newResponse();
        }

        private Object newResponse() {
            createCount.incrementAndGet();
            return new Object();
        }
    }
}
