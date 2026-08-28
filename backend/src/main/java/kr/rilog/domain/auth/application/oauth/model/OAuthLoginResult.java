package kr.rilog.domain.auth.application.oauth.model;

import kr.rilog.domain.user.entity.User;

public record OAuthLoginResult(
        User user,
        String redirectUrl
) {
}
