package kr.rilog.global.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class LoggingProfileConfigTest {

    @Test
    @DisplayName("운영 프로필은 구조화 JSON 로그와 INFO 이상 앱 로그를 사용한다.")
    void prodProfileUsesJsonLogsAndInfoApplicationLogs() throws Exception {
        // given
        PropertySource<?> prodProperties = loadYaml("application-prod.yml");

        // when - then
        assertThat(prodProperties.getProperty("logging.structured.format.console")).isEqualTo("logstash");
        assertThat(prodProperties.getProperty("logging.structured.json.stacktrace.printer"))
                .isEqualTo("kr.rilog.global.logging.SanitizingStackTracePrinter");
        assertThat(prodProperties.getProperty("logging.level.kr.rilog")).isEqualTo("info");
    }

    @Test
    @DisplayName("운영 프로필은 Hibernate SQL과 바인딩 파라미터 상세 로그를 출력하지 않는다.")
    void prodProfileDisablesDetailedSqlLogs() throws Exception {
        // given
        PropertySource<?> prodProperties = loadYaml("application-prod.yml");

        // when - then
        assertThat(prodProperties.getProperty("spring.jpa.properties.hibernate.format_sql")).isEqualTo(false);
        assertThat(prodProperties.getProperty("logging.level.org.hibernate.SQL")).isEqualTo("info");
        assertThat(prodProperties.getProperty("logging.level.org.hibernate.orm.jdbc.bind")).isEqualTo("info");
    }

    @Test
    @DisplayName("개발 프로필은 앱 DEBUG 이상 로그를 사용한다.")
    void developmentProfilesUseDebugApplicationLogs() throws Exception {
        // given
        PropertySource<?> localProperties = loadYaml("application-local.yml");
        PropertySource<?> devProperties = loadYaml("application-dev.yml");

        // when - then
        assertThat(localProperties.getProperty("logging.level.kr.rilog")).isEqualTo("debug");
        assertThat(devProperties.getProperty("logging.level.kr.rilog")).isEqualTo("debug");
    }

    private PropertySource<?> loadYaml(String name) throws IOException {
        return new YamlPropertySourceLoader()
                .load(name, new ClassPathResource(name))
                .getFirst();
    }
}
