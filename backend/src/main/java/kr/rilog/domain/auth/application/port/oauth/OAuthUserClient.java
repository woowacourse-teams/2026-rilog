package kr.rilog.domain.auth.application.port.oauth;

import kr.rilog.domain.auth.application.oauth.model.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginUser;

public interface OAuthUserClient {

    SocialLoginProvider provider();

    SocialLoginUser getUser(OAuthAccessToken accessToken);

}
