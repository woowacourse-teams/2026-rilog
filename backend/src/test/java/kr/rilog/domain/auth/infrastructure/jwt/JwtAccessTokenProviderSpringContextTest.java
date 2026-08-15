package kr.rilog.domain.auth.infrastructure.jwt;

import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.config.AccessTokenProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class JwtAccessTokenProviderSpringContextTest {

    @Test
    @DisplayName("Spring Context에서 JwtAccessTokenProvider Bean을 생성한다")
    void springContextCreatesJwtAccessTokenProvider() {
        // given
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.registerBean(AccessTokenProperties.class, () -> AccessTokenProperties.of(
                    "test-access-token-secret-over-32-bytes",
                    Duration.ofMinutes(15)
            ));
            context.register(JwtAccessTokenProvider.class);

            // when
            context.refresh();

            // then
            assertThat(context.getBean(AccessTokenProvider.class))
                    .isInstanceOf(JwtAccessTokenProvider.class);
        }
    }
}
