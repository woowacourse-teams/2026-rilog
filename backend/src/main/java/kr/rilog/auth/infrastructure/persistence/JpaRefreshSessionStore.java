package kr.rilog.auth.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import kr.rilog.auth.application.port.RefreshSessionStore;
import kr.rilog.auth.domain.RefreshSession;
import org.springframework.stereotype.Repository;

@Repository
public class JpaRefreshSessionStore implements RefreshSessionStore {

    private final RefreshSessionJpaRepository repository;

    public JpaRefreshSessionStore(RefreshSessionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public RefreshSession save(RefreshSession session) {
        return repository.save(session);
    }

    @Override
    public Optional<RefreshSession> findByIdForUpdate(UUID id) {
        return repository.findByIdForUpdate(id);
    }
}
