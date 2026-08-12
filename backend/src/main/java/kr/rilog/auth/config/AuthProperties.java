package kr.rilog.auth.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "rilog.auth")
public record AuthProperties(
        @NotBlank String frontendOrigin,
        @NotNull URI frontendCallbackUri,
        @NotNull Duration oauthAttemptLifetime,
        @NotNull Duration exchangeCodeLifetime,
        @NotNull Duration refreshLifetime,
        @NotNull Duration refreshConcurrencyGrace,
        @Valid @NotNull Github github,
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull Cookie cookie
) {

    public record Github(
            @NotNull URI authorizationEndpoint,
            @NotNull URI tokenEndpoint,
            @NotNull URI userEndpoint,
            @NotBlank String clientId,
            @NotBlank String clientSecret,
            @NotNull URI callbackUri
    ) {

    }

    public record Jwt(
            @NotBlank String issuer,
            @NotBlank String audience,
            @NotBlank String signingSecret,
            @NotNull Duration accessLifetime
    ) {

    }

    public record Cookie(
            boolean secure,
            @NotBlank String sameSite
    ) {

    }

}
