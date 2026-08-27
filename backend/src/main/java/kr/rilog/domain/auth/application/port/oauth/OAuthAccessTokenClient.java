package kr.rilog.domain.auth.application.port.oauth;

import kr.rilog.domain.auth.application.oauth.model.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;

public interface OAuthAccessTokenClient {

    SocialLoginProvider provider();

    OAuthAccessToken exchange(String code);

}
