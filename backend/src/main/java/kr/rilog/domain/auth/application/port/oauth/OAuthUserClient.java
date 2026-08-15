package kr.rilog.domain.auth.application.port.oauth;

import kr.rilog.domain.auth.application.oauth.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;
import kr.rilog.domain.auth.application.oauth.SocialLoginUser;

public interface OAuthUserClient {

    SocialLoginProvider provider();

    SocialLoginUser getUser(OAuthAccessToken accessToken);

}
