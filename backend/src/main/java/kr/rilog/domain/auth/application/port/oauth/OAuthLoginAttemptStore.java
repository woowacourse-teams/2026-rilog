package kr.rilog.domain.auth.application.port.oauth;

import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;
import kr.rilog.domain.auth.application.oauth.OAuthLoginAttempt;

import java.time.Duration;
import java.util.Optional;

public interface OAuthLoginAttemptStore {

    void save(SocialLoginProvider provider, OAuthLoginAttempt attempt, Duration ttl);

    Optional<OAuthLoginAttempt> consume(SocialLoginProvider provider, String state);

}
