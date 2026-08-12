package kr.rilog.auth.presentation;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.net.URI;
import java.time.Duration;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import kr.rilog.global.exception.AuthFailureReason;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class GithubCallbackExceptionHandlerTest {

    @Test
    @DisplayName("GitHub 콜백 실패 로그에는 안전한 실패 원인만 남기고 자격 증명은 남기지 않는다.")
    void logsOnlySafeFailureReasonAndNeverCredentialValues() {
        // given
        Logger logger = (Logger) LoggerFactory.getLogger(
                GithubCallbackExceptionHandler.class
        );
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            GithubCallbackExceptionHandler handler = new GithubCallbackExceptionHandler(
                    new AuthCookieFactory(true, "Lax", Duration.ofMinutes(10)),
                    URI.create("https://rilog.test/auth/callback")
            );

            // when
            handler.handleCallbackFailure(new AuthException(
                    AuthErrorInformation.GITHUB_OAUTH_FAILED,
                    AuthFailureReason.GITHUB_TOKEN_REQUEST_FAILED
            ));

            // then
            String logs = appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .reduce("", (left, right) -> left + right);
            assertTrue(logs.contains("GITHUB_TOKEN_REQUEST_FAILED"));
            assertFalse(logs.contains("client-secret"));
            assertFalse(logs.contains("github-code"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

}
