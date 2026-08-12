package kr.rilog.global.advice;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;

class GlobalExceptionHandlerTest {

    @Test
    @DisplayName("잘못된 요청 본문 로그에는 파서 메시지의 자격 증명을 포함하지 않는다.")
    void malformedBodyLogDoesNotIncludeCredentialFromParserMessage() {
        // given
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            // when
            new GlobalExceptionHandler().handleHttpMessageNotReadableException(
                    new HttpMessageNotReadableException(
                            "Malformed JSON near exchange-id.secret",
                            new MockHttpInputMessage(new byte[0])
                    )
            );

            // then
            String logs = appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .reduce("", (left, right) -> left + right);
            assertTrue(logs.contains("INVALID_REQUEST_BODY"));
            assertFalse(logs.contains("exchange-id.secret"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

}
