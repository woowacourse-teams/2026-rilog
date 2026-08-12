package kr.rilog.global.advice;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;

class GlobalExceptionHandlerTest {

    @Test
    void malformedBodyLogDoesNotIncludeCredentialFromParserMessage() {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            new GlobalExceptionHandler().handleHttpMessageNotReadableException(
                    new HttpMessageNotReadableException(
                            "Malformed JSON near exchange-id.secret",
                            new MockHttpInputMessage(new byte[0])
                    )
            );

            String logs = appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .reduce("", (left, right) -> left + right);
            assertTrue(logs.contains("COMMON_001"));
            assertFalse(logs.contains("exchange-id.secret"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
