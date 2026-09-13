package kr.rilog.global.advice;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    private LogCapture logCapture;

    @AfterEach
    void tearDown() {
        if (logCapture != null) {
            logCapture.stop();
        }
    }

    @Test
    @DisplayName("미처리 예외는 INTERNAL_SERVER_ERROR 응답과 ERROR 로그로 처리한다.")
    void unknownExceptionRespondsInternalServerErrorAndLogsError() throws Exception {
        // given
        MockMvc mockMvc = mockMvc();
        logCapture = LogCapture.start();

        // when - then
        mockMvc.perform(get("/v1/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("INTERNAL_SERVER_ERROR"))
                .andExpect(jsonPath("$.errorCode").value("INTERNAL_SERVER_ERROR"))
                .andExpect(jsonPath("$.message").value("서버 내부 오류가 발생했습니다."));

        ILoggingEvent event = logCapture.onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.ERROR);
        assertThat(event.getThrowableProxy().getClassName()).isEqualTo(IllegalStateException.class.getName());
    }

    @Test
    @DisplayName("4xx 업무 예외는 INFO 로그로 처리하고 stack을 남기지 않는다.")
    void clientBusinessExceptionLogsInfoWithoutStackTrace() throws Exception {
        // given
        MockMvc mockMvc = mockMvc();
        logCapture = LogCapture.start();

        // when - then
        mockMvc.perform(get("/v1/business-4xx"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("OAUTH_CALLBACK_PARAMETER_MISSING"));

        ILoggingEvent event = logCapture.onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.INFO);
        assertThat(event.getThrowableProxy()).isNull();
    }

    @Test
    @DisplayName("요청 파라미터 검증 예외는 400 응답과 INFO 로그로 처리한다.")
    void requestParameterValidationExceptionRespondsBadRequestAndLogsInfo() throws Exception {
        // given
        MockMvc mockMvc = mockMvc();
        logCapture = LogCapture.start();

        // when - then
        mockMvc.perform(get("/v1/request-param-validation")
                        .param("name", "a"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("REQUEST_VALIDATION_FAILED"));

        ILoggingEvent event = logCapture.onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.INFO);
        assertThat(event.getThrowableProxy()).isNull();
    }

    @Test
    @DisplayName("5xx 업무 예외는 cause 추적이 가능하도록 ERROR 로그로 처리한다.")
    void serverBusinessExceptionLogsErrorWithStackTrace() throws Exception {
        // given
        MockMvc mockMvc = mockMvc();
        logCapture = LogCapture.start();

        // when - then
        mockMvc.perform(get("/v1/business-5xx"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_TOKEN_CONFIGURATION_INVALID"));

        ILoggingEvent event = logCapture.onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.ERROR);
        assertThat(event.getThrowableProxy().getClassName()).isEqualTo(AuthException.class.getName());
    }

    @Test
    @DisplayName("정적 리소스 404는 ERROR 로그와 내부 예외 메시지를 남기지 않는다.")
    void staticResourceNotFoundLogsInfoWithoutInternalMessage() {
        // given
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        NoResourceFoundException exception =
                new NoResourceFoundException(HttpMethod.GET, "/missing.js", "No static resource /missing.js.");
        logCapture = LogCapture.start();

        // when
        var response = handler.handleNoResourceFoundException(exception);

        // then
        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody().message()).isEqualTo("요청한 정적 리소스를 찾을 수 없습니다.");
        ILoggingEvent event = logCapture.onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.INFO);
        assertThat(event.getThrowableProxy()).isNull();
    }

    @Test
    @DisplayName("알려진 중복 키 예외는 409 응답과 INFO 로그로 처리한다.")
    void duplicateKeyExceptionRespondsConflictAndLogsInfo() {
        // given
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        DuplicateKeyException exception = new DuplicateKeyException("duplicate key token=secret");
        logCapture = LogCapture.start();

        // when
        var response = handler.handleDuplicateKeyException(exception);

        // then
        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().status()).isEqualTo(409);
        assertThat(response.getBody().errorCode()).isEqualTo("DUPLICATE_KEY_CONFLICT");
        ILoggingEvent event = logCapture.onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.INFO);
        assertThat(event.getThrowableProxy()).isNull();
    }

    @Test
    @DisplayName("미분류 데이터 무결성 예외는 500 응답과 ERROR 로그로 처리한다.")
    void dataIntegrityViolationExceptionRespondsInternalServerErrorAndLogsError() {
        // given
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        DataIntegrityViolationException exception =
                new DataIntegrityViolationException("constraint failed token=secret");
        logCapture = LogCapture.start();

        // when
        var response = handler.handleDataIntegrityViolationException(exception);

        // then
        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().status()).isEqualTo(500);
        ILoggingEvent event = logCapture.onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.ERROR);
        assertThat(event.getThrowableProxy().getClassName())
                .isEqualTo(DataIntegrityViolationException.class.getName());
    }

    private MockMvc mockMvc() {
        return MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @RestController
    private static class TestController {

        @GetMapping("/v1/unexpected")
        String unexpected() {
            throw new IllegalStateException("database failed password=secret");
        }

        @GetMapping("/v1/business-4xx")
        String business4xx() {
            throw new AuthException(AuthErrorInformation.OAUTH_CALLBACK_PARAMETER_MISSING);
        }

        @GetMapping("/v1/business-5xx")
        String business5xx() {
            throw new AuthException(AuthErrorInformation.ACCESS_TOKEN_CONFIGURATION_INVALID);
        }

        @GetMapping("/v1/request-param-validation")
        String requestParamValidation(
                @RequestParam("name")
                @Size(min = 2, message = "name은 2자 이상이어야 합니다.") String name
        ) {
            return name;
        }
    }

    private record LogCapture(Logger logger, ListAppender<ILoggingEvent> appender) {

        private static LogCapture start() {
            Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
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
