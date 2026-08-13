package kr.rilog.domain.auth.application.port;

import kr.rilog.domain.auth.application.AccessToken;
import kr.rilog.domain.auth.application.AccessTokenClaims;
import kr.rilog.domain.auth.application.GlobalRole;

public interface AccessTokenProvider {

    AccessToken issue(Long userId, GlobalRole role, String slug);

    AccessTokenClaims parse(String accessToken);

}
