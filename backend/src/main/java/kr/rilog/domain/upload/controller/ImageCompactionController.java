package kr.rilog.domain.upload.controller;

import io.swagger.v3.oas.annotations.Hidden;
import kr.rilog.domain.auth.infrastructure.crypto.LambdaRequestAuthenticator;
import kr.rilog.domain.upload.controller.dto.request.ImageCompactionUploadUrlRequest;
import kr.rilog.domain.upload.controller.dto.response.ImageCompactionUploadUrlResponse;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.domain.upload.service.ImageCompactionService;
import kr.rilog.domain.upload.service.dto.result.CompactUploadUrlResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static kr.rilog.domain.upload.exception.UploadErrorInformation.INVALID_UPLOAD_TARGET;

/**
 * 이미지 압축 Lambda 전용 내부 API. 사용자 인증 대신 Lambda와 공유한 비밀키의 HMAC 서명으로 호출자를 확인한다.
 *
 * <p>서명이 본문 해시를 포함하므로 본문을 객체가 아닌 수신 바이트로 받아 검증한 뒤 파싱한다.
 */
@Hidden
@RestController
@RequiredArgsConstructor
public class ImageCompactionController {

    static final String UPLOAD_URLS_PATH = "/internal/v1/image-compactions/upload-urls";
    static final String TIMESTAMP_HEADER = "X-Rilog-Lambda-Timestamp";
    static final String SIGNATURE_HEADER = "X-Rilog-Lambda-Signature";

    private final LambdaRequestAuthenticator lambdaRequestAuthenticator;
    private final ImageCompactionService imageCompactionService;
    private final ObjectMapper objectMapper;

    @PostMapping(UPLOAD_URLS_PATH)
    public ApiResponse<ImageCompactionUploadUrlResponse> createUploadUrls(
            @RequestHeader(value = TIMESTAMP_HEADER, required = false) String timestamp,
            @RequestHeader(value = SIGNATURE_HEADER, required = false) String signature,
            @RequestBody(required = false) byte[] rawBody
    ) {
        lambdaRequestAuthenticator.authenticate(UPLOAD_URLS_PATH, rawBody, timestamp, signature);
        ImageCompactionUploadUrlRequest request = readRequest(rawBody);

        List<CompactUploadUrlResult> results = imageCompactionService.createUploadUrls(request.objectKey());

        return ApiResponse.response(
                HttpStatus.OK,
                "압축 이미지 업로드 URL을 정상적으로 발급했습니다",
                ImageCompactionUploadUrlResponse.from(results)
        );
    }

    private ImageCompactionUploadUrlRequest readRequest(byte[] rawBody) {
        if (rawBody == null || rawBody.length == 0) {
            throw new UploadException(INVALID_UPLOAD_TARGET);
        }
        try {
            return objectMapper.readValue(rawBody, ImageCompactionUploadUrlRequest.class);
        } catch (JacksonException exception) {
            throw new UploadException(INVALID_UPLOAD_TARGET);
        }
    }

}
