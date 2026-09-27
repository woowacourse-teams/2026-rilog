package kr.rilog.global.logging;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveDataMaskerTest {

    @ParameterizedTest
    @ValueSource(strings = {"token", "access_token", "refreshToken", "password", "client_secret", "authorization"})
    @DisplayName("따옴표 없는 민감값은 공백과 구분자를 포함해 해당 줄 끝까지 마스킹한다.")
    void maskUnquotedSensitiveValuesUntilLineEnd(String key) {
        String message = key + " = my secret\ttoken, remaining; value&more status=401\r\nnext line";

        assertThat(SensitiveDataMasker.mask(message))
                .isEqualTo(key + " = <redacted>\r\nnext line");
    }

    @Test
    @DisplayName("값이 없는 민감 필드는 다음 줄의 일반 메시지를 가리지 않는다.")
    void maskDoesNotConsumeNextLine() {
        assertThat(SensitiveDataMasker.mask("token = \nstatus=401"))
                .isEqualTo("token = \nstatus=401");
    }

    @Test
    @DisplayName("구조화된 민감값은 경계 밖의 진단 필드를 유지한다.")
    void maskPreservesStructuredValueBoundaries() {
        assertThat(SensitiveDataMasker.mask("{\"token\":\"my secret token\",\"status\":401}"))
                .isEqualTo("{\"token\":\"<redacted>\",\"status\":401}");
        assertThat(SensitiveDataMasker.mask("token = \"my secret token\" status=401"))
                .isEqualTo("token = \"<redacted>\" status=401");
        assertThat(SensitiveDataMasker.mask("token = 'my secret token' status=401"))
                .isEqualTo("token = '<redacted>' status=401");
        assertThat(SensitiveDataMasker.mask("https://example.com?token=my%20secret&state=TEST_STATE&page=2"))
                .isEqualTo("https://example.com?token=<redacted>&state=<redacted>&page=2");
    }

    @Test
    @DisplayName("민감정보 마스커는 JSON 형태의 인증값도 원문으로 남기지 않는다.")
    void maskRemovesJsonCredentials() {
        String message = "{\"access_token\":\"TEST_TOKEN\",\"client_secret\":\"TEST SECRET\"}";

        assertThat(SensitiveDataMasker.mask(message)).doesNotContain("TEST_TOKEN", "TEST SECRET")
                .contains("<redacted>");
    }

    @Test
    @DisplayName("민감정보 마스커는 로그 메시지의 토큰과 인증 관련 값을 원문으로 남기지 않는다.")
    void maskRemovesSensitiveValuesFromLogMessage() {
        // given
        String message = """
                authorization=Bearer SECRET_AUTHORIZATION_VALUE
                access_token=SECRET_ACCESS_TOKEN_VALUE
                refreshToken: SECRET_REFRESH_TOKEN_VALUE
                code=SECRET_OAUTH_CODE_VALUE
                state=SECRET_OAUTH_STATE_VALUE
                Cookie: SECRET_COOKIE_VALUE
                client_secret=SECRET_CLIENT_VALUE
                """;

        // when
        String masked = SensitiveDataMasker.mask(message);

        // then
        assertThat(masked)
                .doesNotContain(
                        "SECRET_AUTHORIZATION_VALUE",
                        "SECRET_ACCESS_TOKEN_VALUE",
                        "SECRET_REFRESH_TOKEN_VALUE",
                        "SECRET_OAUTH_CODE_VALUE",
                        "SECRET_OAUTH_STATE_VALUE",
                        "SECRET_COOKIE_VALUE",
                        "SECRET_CLIENT_VALUE"
                )
                .contains("<redacted>");
    }

    @Test
    @DisplayName("민감정보 마스커는 일반 메시지를 변경하지 않는다.")
    void maskKeepsSafeMessage() {
        // given
        String message = "publish failed because chapter id 10 was missing";

        // when
        String masked = SensitiveDataMasker.mask(message);

        // then
        assertThat(masked).isEqualTo(message);
    }

    @Test
    @DisplayName("민감정보 마스커는 여러 쿠키 값을 헤더 단위로 남기지 않는다.")
    void maskRemovesCookieHeaderValues() {
        // given
        String message = """
                Cookie: refresh_token=SECRET_REFRESH_TOKEN; SESSION=SECRET_SESSION
                Set-Cookie: access_token=SECRET_ACCESS_COOKIE; Path=/; HttpOnly
                """;

        // when
        String masked = SensitiveDataMasker.mask(message);

        // then
        assertThat(masked)
                .doesNotContain("SECRET_REFRESH_TOKEN", "SECRET_SESSION", "SECRET_ACCESS_COOKIE")
                .contains("Cookie: <redacted>")
                .contains("Set-Cookie: <redacted>");
    }

    @Test
    @DisplayName("민감정보 마스커는 따옴표 안의 공백 포함 민감값을 원문으로 남기지 않는다.")
    void maskRemovesQuotedSensitiveValuesWithSpaces() {
        // given
        String message = "password=\"SECRET PASSWORD VALUE\" client_secret='SECRET CLIENT VALUE'";

        // when
        String masked = SensitiveDataMasker.mask(message);

        // then
        assertThat(masked)
                .doesNotContain("SECRET PASSWORD VALUE", "SECRET CLIENT VALUE")
                .contains("password=\"<redacted>\"")
                .contains("client_secret='<redacted>'");
    }
}
