package kr.rilog.domain.auth.application.port;

import java.time.Duration;

public interface OAuthLoginAttemptStore {

    void save(String state, Duration ttl);

    boolean consume(String state);

}
