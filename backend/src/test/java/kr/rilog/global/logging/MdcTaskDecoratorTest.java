package kr.rilog.global.logging;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class MdcTaskDecoratorTest {

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    @DisplayName("작업 제출 시점의 MDC를 실행 스레드로 전달한다.")
    void propagateSubmitterMdcToTask() {
        MdcTaskDecorator decorator = new MdcTaskDecorator();
        AtomicReference<String> capturedRequestId = new AtomicReference<>();
        MDC.put(RequestIdFilter.MDC_KEY, "request-123");

        Runnable decorated = decorator.decorate(() ->
                capturedRequestId.set(MDC.get(RequestIdFilter.MDC_KEY))
        );
        MDC.clear();

        decorated.run();

        assertThat(capturedRequestId).hasValue("request-123");
        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
    }

    @Test
    @DisplayName("CallerRuns 상황에서는 작업 실행 전 MDC를 복원한다.")
    void restorePreviousMdcAfterCallerRunsTask() {
        MdcTaskDecorator decorator = new MdcTaskDecorator();
        MDC.put(RequestIdFilter.MDC_KEY, "submitted-request");
        Runnable decorated = decorator.decorate(() -> {
            assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isEqualTo("submitted-request");
            MDC.put(RequestIdFilter.MDC_KEY, "mutated-in-task");
        });
        MDC.put(RequestIdFilter.MDC_KEY, "caller-request");

        decorated.run();

        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isEqualTo("caller-request");
    }
}
