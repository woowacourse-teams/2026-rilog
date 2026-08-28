package kr.rilog.domain.auth.application.oauth.model;

public record OAuthLoginAttempt(
        String state,
        String redirectUrl
) {
}
