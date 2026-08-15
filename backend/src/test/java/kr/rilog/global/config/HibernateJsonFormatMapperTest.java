package kr.rilog.global.config;

import org.hibernate.type.format.jackson.Jackson3JsonFormatMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.boot.env.YamlPropertySourceLoader;
import tools.jackson.databind.JsonNode;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class HibernateJsonFormatMapperTest {

    private final Jackson3JsonFormatMapper formatMapper = new Jackson3JsonFormatMapper();

    @Test
    void applicationConfigSelectsJackson3ForHibernateJsonMapping() throws IOException {
        StandardEnvironment environment = new StandardEnvironment();
        new YamlPropertySourceLoader()
                .load("application", new ClassPathResource("application.yaml"))
                .forEach(environment.getPropertySources()::addLast);

        assertThat(environment.getProperty("spring.jpa.properties.hibernate.type.json_format_mapper"))
                .isEqualTo("jackson3");
    }

    @Test
    void jackson3JsonFormatMapperDeserializesJsonNode() {
        JsonNode content = formatMapper.fromString(
                """
                        {"type":"paragraph","content":[{"text":"hello"}]}
                        """,
                JsonNode.class
        );

        assertThat(content.get("type").asString()).isEqualTo("paragraph");
        assertThat(content.get("content").get(0).get("text").asString()).isEqualTo("hello");
    }
}
