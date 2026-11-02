package kr.rilog.domain.upload.controller;

import kr.rilog.domain.auth.config.LambdaRequestProperties;
import kr.rilog.domain.auth.infrastructure.crypto.LambdaRequestAuthenticator;
import kr.rilog.domain.upload.exception.UploadErrorInformation;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.domain.upload.service.ImageCompactionService;
import kr.rilog.domain.upload.service.dto.result.CompactUploadUrlResult;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.json.JsonMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ImageCompactionControllerTest {

    private static final String SECRET = "test-internal-lambda-secret-at-least-32-chars";
    private static final String PATH = "/internal/v1/image-compactions/upload-urls";
    private static final Instant NOW = Instant.parse("2026-10-21T00:00:00Z");
    private static final String OBJECT_KEY = "rilog/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png";
    private static final String BODY = "{\"objectKey\":\"" + OBJECT_KEY + "\"}";

    private final ImageCompactionService imageCompactionService = mock(ImageCompactionService.class);
    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ImageCompactionController(
                    new LambdaRequestAuthenticator(new LambdaRequestProperties(SECRET), Clock.fixed(NOW, ZoneOffset.UTC)),
                    imageCompactionService,
                    JsonMapper.builder().build()
            ))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    @DisplayName("올바르게 서명한 요청이면 압축본 업로드 URL 목록을 반환한다")
    void createUploadUrls() throws Exception {
        when(imageCompactionService.createUploadUrls(OBJECT_KEY)).thenReturn(List.of(new CompactUploadUrlResult(
                750,
                "rilog/images/compact/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/750.webp",
                "https://bucket.s3.amazonaws.com/750.webp?X-Amz-Signature=abc",
                Map.of("content-type", List.of("image/webp")),
                NOW.plusSeconds(600)
        )));

        mockMvc.perform(signed(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.uploads[0].width").value(750))
                .andExpect(jsonPath("$.data.uploads[0].uploadUrl")
                        .value("https://bucket.s3.amazonaws.com/750.webp?X-Amz-Signature=abc"))
                .andExpect(jsonPath("$.data.uploads[0].headers.content-type[0]").value("image/webp"));

        verify(imageCompactionService).createUploadUrls(OBJECT_KEY);
    }

    @Test
    @DisplayName("서명 헤더가 없으면 401로 거부하고 URL을 발급하지 않는다")
    void rejectUnsignedRequest() throws Exception {
        mockMvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_LAMBDA_REQUEST_SIGNATURE"));

        verifyNoInteractions(imageCompactionService);
    }

    @Test
    @DisplayName("서명 후 objectKey를 바꾼 요청은 401로 거부한다")
    void rejectTamperedBody() throws Exception {
        String timestamp = String.valueOf(NOW.getEpochSecond());
        String tamperedBody = BODY.replace("/7-", "/9-");

        mockMvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(ImageCompactionController.TIMESTAMP_HEADER, timestamp)
                        .header(ImageCompactionController.SIGNATURE_HEADER, sign(timestamp, BODY))
                        .content(tamperedBody))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(imageCompactionService);
    }

    @Test
    @DisplayName("서명은 맞지만 본문을 읽을 수 없으면 400으로 거부한다")
    void rejectUnreadableBody() throws Exception {
        mockMvc.perform(signed("not-json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_UPLOAD_TARGET"));

        verifyNoInteractions(imageCompactionService);
    }

    @Test
    @DisplayName("서비스가 key를 거부하면 400을 반환한다")
    void rejectInvalidObjectKey() throws Exception {
        when(imageCompactionService.createUploadUrls(anyString()))
                .thenThrow(new UploadException(UploadErrorInformation.INVALID_UPLOAD_TARGET));

        mockMvc.perform(signed("{\"objectKey\":\"rilog/files/raw/x/original.png\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_UPLOAD_TARGET"));
    }

    private MockHttpServletRequestBuilder signed(String body) {
        String timestamp = String.valueOf(NOW.getEpochSecond());
        return post(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .header(ImageCompactionController.TIMESTAMP_HEADER, timestamp)
                .header(ImageCompactionController.SIGNATURE_HEADER, sign(timestamp, body))
                .content(body);
    }

    private String sign(String timestamp, String body) {
        try {
            byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);
            String bodyHash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bodyBytes));
            String payload = timestamp + "\nPOST\n" + PATH + "\n" + bodyHash;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return "v1=" + HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
