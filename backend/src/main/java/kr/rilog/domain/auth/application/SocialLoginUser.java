package kr.rilog.domain.auth.application;

public record SocialLoginUser(
        SocialLoginProvider provider,
        String providerUserId,
        String username,
        String profileImageUrl
) {
}
