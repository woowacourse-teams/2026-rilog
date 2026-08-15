package kr.rilog.domain.auth.application.oauth;

public record SocialLoginUser(
        SocialLoginProvider provider,
        String providerUserId,
        String username,
        String profileImageUrl
) {
}
