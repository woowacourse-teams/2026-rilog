package kr.rilog.domain.auth.application.port.token;

import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.GlobalRole;

public interface AccessTokenProvider {

    AccessToken issue(Long userId, GlobalRole role, String slug);

    AccessTokenClaims parse(String accessToken);

}
