package kr.rilog.global.logging;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RequestIdFilterTest {

    private final RequestIdFilter requestIdFilter = new RequestIdFilter();
    private LogCapture logCapture;

    @AfterEach
    void clearMdc() {
        MDC.clear();
        if (logCapture != null) {
            logCapture.stop();
        }
    }

    @Test
    @DisplayName("요청 ID 필터는 클라이언트가 보낸 ID 대신 새 UUID를 응답과 로그 MDC에 담는다.")
    void requestIdFilterCreatesServerRequestId() throws Exception {
        // given
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
        request.addHeader(RequestIdFilter.REQUEST_ID_HEADER, "client-request-id");
        MockHttpServletResponse response = new MockHttpServletResponse();
        logCapture = LogCapture.start();

        // when
        requestIdFilter.doFilter(request, response, (servletRequest, servletResponse) ->
                logCapture.logger().info("request id capture"));

        // then
        String requestId = response.getHeader(RequestIdFilter.REQUEST_ID_HEADER);
        assertThat(requestId).isNotEqualTo("client-request-id");
        assertThat(UUID.fromString(requestId).toString()).isEqualTo(requestId);
        assertThat(logCapture.onlyEvent().getMDCPropertyMap())
                .containsEntry(RequestIdFilter.MDC_KEY, requestId);
    }

    @Test
    @DisplayName("요청 ID 필터는 연속 요청마다 새 ID를 만들고 요청 종료 후 MDC를 정리한다.")
    void requestIdFilterClearsRequestIdAfterEachRequest() throws Exception {
        // given
        MockHttpServletResponse firstResponse = new MockHttpServletResponse();
        MockHttpServletResponse secondResponse = new MockHttpServletResponse();

        // when
        requestIdFilter.doFilter(new MockHttpServletRequest("GET", "/first"), firstResponse,
                (request, response) -> assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNotNull());
        String firstRequestId = firstResponse.getHeader(RequestIdFilter.REQUEST_ID_HEADER);

        requestIdFilter.doFilter(new MockHttpServletRequest("GET", "/second"), secondResponse,
                (request, response) -> assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNotNull());
        String secondRequestId = secondResponse.getHeader(RequestIdFilter.REQUEST_ID_HEADER);

        // then
        assertThat(firstRequestId).isNotEqualTo(secondRequestId);
        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
    }

    @Test
    @DisplayName("요청 ID 필터는 예외가 발생해도 응답 헤더를 남기고 MDC를 정리한다.")
    void requestIdFilterClearsRequestIdWhenRequestFails() throws Exception {
        // given
        RuntimeException failure = new RuntimeException("boom");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // when - then
        assertThatThrownBy(() -> requestIdFilter.doFilter(
                new MockHttpServletRequest("GET", "/fails"),
                response,
                (request, servletResponse) -> {
                    assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNotNull();
                    throw failure;
                }
        )).isSameAs(failure);

        assertThat(response.getHeader(RequestIdFilter.REQUEST_ID_HEADER)).isNotBlank();
        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
    }

    private record LogCapture(Logger logger, ListAppender<ILoggingEvent> appender) {

        private static LogCapture start() {
            Logger logger = (Logger) LoggerFactory.getLogger("request-id-filter-test");
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
