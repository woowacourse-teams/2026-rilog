package kr.rilog.domain.auth.application.port.oauth;

import kr.rilog.domain.auth.application.oauth.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;

public interface OAuthAccessTokenClient {

    SocialLoginProvider provider();

    OAuthAccessToken exchange(String code);

}
