package kr.rilog.domain.auth.application.port;

import kr.rilog.domain.auth.application.SocialLoginProvider;

import java.net.URI;
import java.time.Duration;

public interface OAuthAuthorizationUrlProvider {

    SocialLoginProvider provider();

    Duration stateTtl();

    URI createAuthorizationUri(String state);

}
