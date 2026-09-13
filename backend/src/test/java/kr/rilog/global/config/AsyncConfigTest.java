package kr.rilog.global.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import kr.rilog.global.logging.RequestIdFilter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.lang.reflect.Method;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class AsyncConfigTest {

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    @DisplayName("S3 태깅 executor는 작업 제출 시점의 requestId를 비동기 스레드로 전달한다.")
    void s3TaggingExecutorPropagatesRequestId() throws InterruptedException {
        ThreadPoolTaskExecutor executor = new AsyncConfig().s3TaggingExecutor();
        executor.initialize();
        CountDownLatch executed = new CountDownLatch(1);
        AtomicReference<String> capturedRequestId = new AtomicReference<>();
        MDC.put(RequestIdFilter.MDC_KEY, "request-123");

        try {
            executor.execute(() -> {
                capturedRequestId.set(MDC.get(RequestIdFilter.MDC_KEY));
                executed.countDown();
            });

            assertThat(executed.await(3, TimeUnit.SECONDS)).isTrue();
            assertThat(capturedRequestId).hasValue("request-123");
        } finally {
            executor.shutdown();
        }
    }

    @Test
    @DisplayName("미처리 비동기 예외는 method와 cause를 ERROR 로그로 남긴다.")
    void asyncUncaughtExceptionHandlerLogsFailure() throws NoSuchMethodException {
        AsyncConfig asyncConfig = new AsyncConfig();
        AsyncUncaughtExceptionHandler handler = asyncConfig.getAsyncUncaughtExceptionHandler();
        RuntimeException failure = new RuntimeException("async failed token=secret");
        Method method = AsyncFailureFixture.class.getDeclaredMethod("fail");
        LogCapture logCapture = LogCapture.start();

        try {
            assertThat(handler).isNotNull();
            handler.handleUncaughtException(failure, method);

            ILoggingEvent event = logCapture.onlyEvent();
            assertThat(event.getLevel()).isEqualTo(Level.ERROR);
            assertThat(event.getFormattedMessage())
                    .contains("event=async_uncaught_exception")
                    .contains("method=fail")
                    .doesNotContain("token=secret");
            assertThat(event.getThrowableProxy().getClassName())
                    .isEqualTo(RuntimeException.class.getName());
        } finally {
            logCapture.stop();
        }
    }

    private static class AsyncFailureFixture {

        void fail() {
        }
    }

    private record LogCapture(Logger logger, ListAppender<ILoggingEvent> appender) {

        private static LogCapture start() {
            Logger logger = (Logger) LoggerFactory.getLogger(AsyncConfig.class);
            ListAppender<ILoggingEvent> appender = new ListAppender<>();
            appender.start();
            logger.addAppender(appender);
            return new LogCapture(logger, appender);
        }

        private ILoggingEvent onlyEvent() {
            assertThat(appender.list).hasSize(1);
            return appender.list.getFirst();
        }

        private void stop() {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
