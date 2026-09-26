package kr.rilog.global.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RilogInfrastructureExceptionTest {

    @Test
    @DisplayName("기존 인프라 예외 생성자는 추가 로그 문맥 없이 사용할 수 있다.")
    void existingConstructorsUseEmptyContext() {
        var error = GlobalExceptionInformation.INTERNAL_SERVER_ERROR;
        var cause = new IllegalStateException("connection failed");

        List<RilogInfrastructureException> exceptions = List.of(
                new RilogInfrastructureException(error),
                new RilogInfrastructureException(error, cause),
                new RilogInfrastructureException(error, "safe context", cause)
        );

        assertThat(exceptions).allSatisfy(exception -> assertThat(exception.getLogContext()).isEmpty());
    }

    @Test
    @DisplayName("인프라 예외는 로그 문맥을 복사하여 외부 수정으로부터 보호한다.")
    void logContextIsAnImmutableSnapshot() {
        Map<String, Object> context = new HashMap<>(Map.of("provider", "GITHUB", "durationMs", 12L));
        var cause = new IllegalStateException("connection failed");
        var exception = new RilogInfrastructureException(
                GlobalExceptionInformation.INTERNAL_SERVER_ERROR, "safe context", cause, context
        );

        context.put("provider", "changed");

        assertThat(exception.getLogContext()).isEqualTo(Map.of("provider", "GITHUB", "durationMs", 12L));
        assertThat(exception.getCause()).isSameAs(cause);
        assertThatThrownBy(() -> exception.getLogContext().put("provider", "changed"))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
