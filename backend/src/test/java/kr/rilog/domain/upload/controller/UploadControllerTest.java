package kr.rilog.domain.upload.controller;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;
import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.upload.domain.enums.ImagePurpose;
import kr.rilog.domain.upload.exception.ImageImportErrorInformation;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.domain.upload.service.ImageImportService;
import kr.rilog.domain.upload.service.UploadService;
import kr.rilog.domain.upload.service.dto.result.ImageImportResult;
import kr.rilog.global.advice.GlobalExceptionHandler;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UploadControllerTest {

    private static final String SOURCE_URL = "https://example.com/a.png";
    private static final String OBJECT_KEY = "rilog/profiles/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.webp";
    private static final String REQUEST_BODY = """
            {"sourceUrl":"%s","imagePurpose":"PROFILE"}
            """.formatted(SOURCE_URL);

    private final ImageImportService imageImportService = mock(ImageImportService.class);
    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new UploadController(
                    mock(UploadService.class),
                    imageImportService
            ))
            .addInterceptors(new BearerAuthenticationInterceptor(
                    new FixedAccessTokenProvider(),
                    new UnusedOnboardingTokenProvider()
            ))
            .setCustomArgumentResolvers(new LoginUserIdArgumentResolver())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    @DisplayName("POST /v1/uploads/image-imports는 토큰의 사용자 ID로 이미지 서버에 중계한 결과를 반환한다")
    void importImage() throws Exception {
        when(imageImportService.importImage(7L, SOURCE_URL, ImagePurpose.PROFILE))
                .thenReturn(new ImageImportResult(OBJECT_KEY, "https://cdn.example.com/" + OBJECT_KEY));

        mockMvc.perform(post("/v1/uploads/image-imports")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.objectKey").value(OBJECT_KEY))
                .andExpect(jsonPath("$.data.url").value("https://cdn.example.com/" + OBJECT_KEY));
    }

    @Test
    @DisplayName("sourceUrl이나 imagePurpose가 없으면 이미지 서버를 호출하지 않는다")
    void rejectsInvalidRequest() throws Exception {
        for (String body : new String[]{
                "{\"imagePurpose\":\"PROFILE\"}",
                "{\"sourceUrl\":\"" + SOURCE_URL + "\"}",
                "{\"sourceUrl\":\"" + SOURCE_URL + "\",\"imagePurpose\":\"FILE\"}"
        }) {
            mockMvc.perform(post("/v1/uploads/image-imports")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(imageImportService);
    }

    @Test
    @DisplayName("인증 헤더가 없으면 이미지 서버를 호출하지 않는다")
    void rejectsMissingAuthorization() throws Exception {
        mockMvc.perform(post("/v1/uploads/image-imports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(imageImportService);
    }

    @Test
    @DisplayName("이미지 서버 오류는 Spring 오류 형식의 상태와 코드로 응답한다")
    void respondsImageServerErrors() throws Exception {
        when(imageImportService.importImage(anyLong(), anyString(), any()))
                .thenThrow(new UploadException(ImageImportErrorInformation.BUSY))
                .thenThrow(new RilogInfrastructureException(ImageImportErrorInformation.IMAGE_IMPORT_UNAVAILABLE));

        mockMvc.perform(post("/v1/uploads/image-imports")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorCode").value("BUSY"));

        mockMvc.perform(post("/v1/uploads/image-imports")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.errorCode").value("IMAGE_IMPORT_UNAVAILABLE"));
    }

    private static class FixedAccessTokenProvider implements AccessTokenProvider {

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            return AccessTokenClaims.of(
                    7L,
                    GlobalRole.USER,
                    "riro",
                    Instant.parse("2026-10-29T00:00:00Z"),
                    Instant.parse("2026-10-29T00:15:00Z")
            );
        }
    }

    private static class UnusedOnboardingTokenProvider implements OnboardingTokenProvider {

        @Override
        public OnboardingToken issue(Long userId) {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public OnboardingTokenClaims parse(String onboardingToken) {
            throw new UnsupportedOperationException("Not used in this test");
        }
    }
}
