package kr.rilog.domain.auth.application.port.token;

import kr.rilog.domain.auth.entity.RefreshSession;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshSessionStore {

    void save(RefreshSession refreshSession, Duration ttl);

    Optional<RefreshSession> findByTokenHash(String tokenHash);

    Optional<RefreshSession> consume(String tokenHash);

    void revoke(String tokenHash, LocalDateTime revokedAt);
}
