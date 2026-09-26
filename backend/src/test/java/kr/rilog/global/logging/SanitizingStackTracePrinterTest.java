package kr.rilog.global.logging;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClientResponseException;
import software.amazon.awssdk.core.exception.SdkClientException;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class SanitizingStackTracePrinterTest {

    @Test
    @DisplayName("외부 HTTP 오류의 원문 본문은 root와 cause 및 suppressed 스택에서 제외한다.")
    void externalResponseBodiesAreExcludedFromEntireStack() {
        var root = responseFailure("TEST_ROOT_BODY");
        root.initCause(responseFailure("TEST_CAUSE_BODY"));
        root.addSuppressed(responseFailure("TEST_SUPPRESSED_BODY"));
        root.setStackTrace(new StackTraceElement[]{
                new StackTraceElement("kr.rilog.GithubClient", "exchange", "GithubClient.java", 42)
        });

        String stack = new SanitizingStackTracePrinter().printStackTraceToString(root);

        assertThat(stack).contains("RestClientResponseException", "503", "Caused by:", "Suppressed:")
                .contains("kr.rilog.GithubClient.exchange(GithubClient.java:42)")
                .doesNotContain("TEST_ROOT_BODY", "TEST_CAUSE_BODY", "TEST_SUPPRESSED_BODY");
    }

    @Test
    @DisplayName("SDK 예외 스택은 AWS 자격 증명과 presigned URL을 노출하지 않는다.")
    void sdkFailureDoesNotExposeCredentialsOrPresignedUrl() {
        var exception = SdkClientException.create("""
                aws_access_key_id=TEST_ACCESS_KEY aws_secret_access_key=TEST_SECRET_KEY aws_session_token=TEST_SESSION
                https://bucket.example/image.png?X-Amz-Credential=TEST_CREDENTIAL&X-Amz-Signature=TEST_SIGNATURE
                """);

        String stack = new SanitizingStackTracePrinter().printStackTraceToString(exception);

        assertThat(stack).contains("SdkClientException", "<redacted>")
                .doesNotContain("TEST_ACCESS_KEY", "TEST_SECRET_KEY", "TEST_SESSION", "TEST_CREDENTIAL", "TEST_SIGNATURE")
                .doesNotContain("https://bucket.example/image.png");
    }

    private RestClientResponseException responseFailure(String body) {
        return new RestClientResponseException(
                "503: " + body, 503, "Unavailable", HttpHeaders.EMPTY,
                body.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8
        );
    }

    @Test
    @DisplayName("예외 스택 출력기는 원인과 suppressed 구조를 보존하고 민감한 메시지만 마스킹한다.")
    void printStackTraceKeepsExceptionStructureAndMasksSensitiveMessages() {
        // given
        IllegalArgumentException cause =
                new IllegalArgumentException("github failed access_token=SECRET_CAUSE_TOKEN");
        IllegalStateException exception =
                new IllegalStateException("request failed authorization=Bearer SECRET_ROOT_TOKEN", cause);
        exception.addSuppressed(new RuntimeException("redis failed password=SECRET_SUPPRESSED_PASSWORD"));
        exception.setStackTrace(new StackTraceElement[]{
                new StackTraceElement("kr.rilog.TestTarget", "run", "TestTarget.java", 12)
        });

        SanitizingStackTracePrinter printer = new SanitizingStackTracePrinter();

        // when
        String stackTrace = printer.printStackTraceToString(exception);

        // then
        assertThat(stackTrace)
                .contains("java.lang.IllegalStateException")
                .contains("Caused by: java.lang.IllegalArgumentException")
                .contains("Suppressed: java.lang.RuntimeException")
                .contains("kr.rilog.TestTarget.run(TestTarget.java:12)")
                .doesNotContain("SECRET_ROOT_TOKEN", "SECRET_CAUSE_TOKEN", "SECRET_SUPPRESSED_PASSWORD")
                .contains("<redacted>");
    }
}
