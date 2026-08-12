package kr.rilog.auth.config;

import java.net.URI;
import java.time.Clock;
import kr.rilog.auth.application.AuthPolicy;
import kr.rilog.auth.application.port.AccessTokenCodec;
import kr.rilog.auth.application.port.GithubOAuthGateway;
import kr.rilog.auth.infrastructure.github.GithubHttpClient;
import kr.rilog.auth.infrastructure.security.JwtAccessTokenCodec;
import kr.rilog.auth.presentation.AuthCookieFactory;
import kr.rilog.auth.presentation.AuthOriginInterceptor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AuthProperties.class)
public class AuthConfiguration {

    @Bean
    RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }

    @Bean
    Clock authClock() {
        return Clock.systemUTC();
    }

    @Bean
    AuthPolicy authPolicy(AuthProperties properties) {
        return new AuthPolicy(
                properties.oauthAttemptLifetime(),
                properties.exchangeCodeLifetime(),
                properties.refreshLifetime(),
                properties.refreshConcurrencyGrace()
        );
    }

    @Bean
    AccessTokenCodec accessTokenCodec(AuthProperties properties, Clock authClock) {
        AuthProperties.Jwt jwt = properties.jwt();
        return new JwtAccessTokenCodec(
                jwt.signingSecret(),
                jwt.issuer(),
                jwt.audience(),
                jwt.accessLifetime(),
                authClock
        );
    }

    @Bean
    GithubOAuthGateway githubOAuthGateway(
            RestClient.Builder restClientBuilder,
            AuthProperties properties
    ) {
        AuthProperties.Github github = properties.github();
        return new GithubHttpClient(
                restClientBuilder.build(),
                github.authorizationEndpoint(),
                github.tokenEndpoint(),
                github.userEndpoint(),
                github.clientId(),
                github.clientSecret(),
                github.callbackUri()
        );
    }

    @Bean
    AuthCookieFactory authCookieFactory(AuthProperties properties) {
        return new AuthCookieFactory(
                properties.cookie().secure(),
                properties.cookie().sameSite(),
                properties.oauthAttemptLifetime()
        );
    }

    @Bean
    AuthOriginInterceptor authOriginInterceptor(AuthProperties properties) {
        return new AuthOriginInterceptor(properties.frontendOrigin());
    }

    @Bean
    URI frontendCallbackUri(AuthProperties properties) {
        return properties.frontendCallbackUri();
    }

}
