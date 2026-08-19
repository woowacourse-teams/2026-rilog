package kr.rilog.domain.auth.application.oauth;

public record OAuthLoginAttempt(
        String state,
        String redirectUrl
) {
}
