package kr.rilog.global.logging;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SanitizingStackTracePrinterTest {

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
