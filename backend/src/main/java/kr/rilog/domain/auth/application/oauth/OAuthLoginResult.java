package kr.rilog.domain.auth.application.oauth;

import kr.rilog.domain.user.entity.User;

public record OAuthLoginResult(
        User user,
        String redirectUrl
) {
}
