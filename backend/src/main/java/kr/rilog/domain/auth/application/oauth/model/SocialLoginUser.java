package kr.rilog.domain.auth.application.oauth.model;

public record SocialLoginUser(
        SocialLoginProvider provider,
        String providerUserId,
        String username,
        String profileImageUrl
) {
}
