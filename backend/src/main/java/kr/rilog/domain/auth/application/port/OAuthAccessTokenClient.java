package kr.rilog.domain.auth.application.port;

import kr.rilog.domain.auth.application.OAuthAccessToken;
import kr.rilog.domain.auth.application.SocialLoginProvider;

public interface OAuthAccessTokenClient {

    SocialLoginProvider provider();

    OAuthAccessToken exchange(String code);

}
