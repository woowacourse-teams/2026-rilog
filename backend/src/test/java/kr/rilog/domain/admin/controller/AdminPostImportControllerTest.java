package kr.rilog.domain.admin.controller;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import kr.rilog.domain.admin.service.AdminPostImportService;
import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.upload.domain.enums.UploadType;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;
import kr.rilog.domain.upload.service.dto.result.PresignedUrlCreateResult;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import java.util.stream.Collectors;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_ACCESS_TOKEN;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AdminPostImportControllerTest {

    private static final long TARGET_ID = 123L;
    private static final String BASE = "/v1/admin/users/123";
    private static final Instant ORIGINAL_DATE = Instant.parse("2024-03-15T05:30:00Z");
    private static final String POST_BODY = """
            {
              "slug": "author_blog", "title": "원문 제목", "content": [],
              "category": "RETROSPECT", "visibility": "PUBLIC",
              "thumbnailImageUrl": null, "chapterId": null,
              "publishedAt": "2024-03-15T14:30:00+09:00"
            }
            """;

    private AdminPostImportService importService;
    private MockMvc mockMvc;
    private Logger logger;
    private ListAppender<ILoggingEvent> logs;

    @BeforeEach
    void setUp() {
        logger = (Logger) LoggerFactory.getLogger(AdminPostImportController.class);
        logs = new ListAppender<>();
        logs.start();
        logger.addAppender(logs);
        importService = mock(AdminPostImportService.class);
        AccessTokenProvider tokens = mock(AccessTokenProvider.class);
        when(tokens.parse("admin-token")).thenReturn(claims(GlobalRole.ADMIN));
        when(tokens.parse("user-token")).thenReturn(claims(GlobalRole.USER));
        when(tokens.parse("onboarding-token")).thenThrow(new AuthException(INVALID_ACCESS_TOKEN));
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminPostImportController(importService))
                .addInterceptors(new BearerAuthenticationInterceptor(tokens, mock(OnboardingTokenProvider.class)))
                .setCustomArgumentResolvers(new LoginUserIdArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(logs);
        logs.stop();
    }

    @ParameterizedTest
    @MethodSource("unauthorizedRequests")
    @DisplayName("두 관리자 API는 무인증·일반 사용자·ONBOARDING 토큰을 거절한다")
    void rejectsNonAdminAccess(String endpoint, String token, int expectedStatus) throws Exception {
        // given
        var request = post(BASE + endpoint).contentType(MediaType.APPLICATION_JSON).content("{}");
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }

        // when - then
        mockMvc.perform(request).andExpect(status().is(expectedStatus));

        verifyNoInteractions(importService);
        assertThat(logs.list).isEmpty();
    }

    static Stream<Arguments> unauthorizedRequests() {
        return Stream.of("/posts", "/uploads/presigned-url").flatMap(endpoint -> Stream.of(
                Arguments.of(endpoint, null, 401),
                Arguments.of(endpoint, "user-token", 403),
                Arguments.of(endpoint, "onboarding-token", 401)
        ));
    }

    @Test
    @DisplayName("관리자 업로드 응답은 대상 ID와 기존 서명 헤더를 사용한다")
    void createsTargetUploadUrl() throws Exception {
        // given
        var headers = Map.of("x-amz-tagging", List.of("status=CONFIRMED"));
        when(importService.createUploadUrl(eq(TARGET_ID), any())).thenReturn(new PresignedUrlCreateResult(
                UUID.fromString("b38e9b2c-4c13-4f52-9c31-0e52d768d517"),
                "rilog/uploads/images/originals/123-example.png",
                "https://storage.example/upload", headers, Instant.parse("2030-01-01T00:00:00Z")
        ));

        // when - then
        mockMvc.perform(post(BASE + "/uploads/presigned-url")
                        .header("Authorization", "Bearer admin-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fileName":"image.png","contentType":"image/png","size":1024,"type":"IMAGE"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headers['x-amz-tagging'][0]").value("status=CONFIRMED"));

        verify(importService).createUploadUrl(TARGET_ID,
                new PresignedUrlCreateCommand("image.png", "image/png", 1024, UploadType.IMAGE));
    }

    @ParameterizedTest
    @ValueSource(strings = {"chapter", "missingDate", "futureDate", "offsetMissing", "missingCategory", "missingVisibility"})
    @DisplayName("챕터 지정과 원문 날짜·필수 선택값 오류는 발행 전에 거절한다")
    void rejectsInvalidImportMetadata(String scenario) throws Exception {
        // given
        String body = switch (scenario) {
            case "chapter" -> POST_BODY.replace("\"chapterId\": null", "\"chapterId\": 1");
            case "missingDate" -> POST_BODY.replace("\"2024-03-15T14:30:00+09:00\"", "null");
            case "futureDate" -> POST_BODY.replace("2024-03-15", "2999-03-15");
            case "offsetMissing" -> POST_BODY.replace("14:30:00+09:00", "14:30:00");
            case "missingCategory" -> POST_BODY.replace("\"RETROSPECT\"", "null");
            case "missingVisibility" -> POST_BODY.replace("\"PUBLIC\"", "null");
            default -> throw new IllegalArgumentException(scenario);
        };

        // when - then
        mockMvc.perform(post(BASE + "/posts")
                        .header("Authorization", "Bearer admin-token")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(importService);
    }

    private AccessTokenClaims claims(GlobalRole role) {
        return AccessTokenClaims.of(9L, role, "operator_blog",
                Instant.parse("2020-01-01T00:00:00Z"), Instant.parse("2030-01-01T00:00:00Z"));
    }
}
