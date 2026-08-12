package kr.rilog.domain.auth.application.port;

import kr.rilog.domain.auth.application.SocialLoginProvider;

import java.time.Duration;

public interface OAuthLoginAttemptStore {

    void save(SocialLoginProvider provider, String state, Duration ttl);

    boolean consume(SocialLoginProvider provider, String state);

}
