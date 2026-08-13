package kr.rilog.domain.auth.application.port.oauth;

import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;

import java.time.Duration;

public interface OAuthLoginAttemptStore {

    void save(SocialLoginProvider provider, String state, Duration ttl);

    boolean consume(SocialLoginProvider provider, String state);

}
