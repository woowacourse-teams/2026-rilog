package kr.rilog.domain.auth.application.port;

import kr.rilog.domain.auth.application.OAuthAccessToken;
import kr.rilog.domain.auth.application.SocialLoginProvider;
import kr.rilog.domain.auth.application.SocialLoginUser;

public interface OAuthUserClient {

    SocialLoginProvider provider();

    SocialLoginUser getUser(OAuthAccessToken accessToken);

}
