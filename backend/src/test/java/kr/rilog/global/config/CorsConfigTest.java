package kr.rilog.global.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

class CorsConfigTest {

    @Test
    @DisplayName("프론트 연동을 위해 credentials 기반 CORS 정책을 적용한다")
    void addCorsMappingsAllowsConfiguredOriginsWithCredentials() {
        // given
        CorsProperties properties = new CorsProperties(List.of(
                "http://localhost:3000",
                "http://localhost:5173"
        ));
        CorsConfig corsConfig = new CorsConfig(properties);
        TestCorsRegistry registry = new TestCorsRegistry();

        // when
        corsConfig.addCorsMappings(registry);

        // then
        CorsConfiguration configuration = registry.configurations()
                .get("/**");
        assertThat(configuration.getAllowedOrigins())
                .containsExactly("http://localhost:3000", "http://localhost:5173");
        assertThat(configuration.getAllowedMethods())
                .containsExactly("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD");
        assertThat(configuration.getAllowedHeaders())
                .containsExactly("*");
        assertThat(configuration.getExposedHeaders())
                .containsExactly(HttpHeaders.AUTHORIZATION, "Cache-Control", "Content-Type");
        assertThat(configuration.getAllowCredentials()).isTrue();
    }

    @Test
    @DisplayName("CORS 허용 Origin은 설정 파일에서 반드시 주입되어야 한다")
    void corsPropertiesRequiresAllowedOrigins() {
        // when - then
        assertThatNullPointerException()
                .isThrownBy(() -> new CorsProperties(null))
                .withMessage("app.cors.allowed-origins 설정은 필수입니다.");
    }

    private static class TestCorsRegistry extends CorsRegistry {

        private Map<String, CorsConfiguration> configurations() {
            return getCorsConfigurations();
        }
    }
}
