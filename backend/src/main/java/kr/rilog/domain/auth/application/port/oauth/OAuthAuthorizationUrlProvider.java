package kr.rilog.domain.auth.application.port.oauth;

import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;

import java.net.URI;
import java.time.Duration;

public interface OAuthAuthorizationUrlProvider {

    SocialLoginProvider provider();

    Duration stateTtl();

    URI createAuthorizationUri(String state);

}
