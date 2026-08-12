package kr.rilog.auth.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import kr.rilog.auth.application.port.RefreshTokenRecordStore;
import kr.rilog.auth.domain.RefreshTokenRecord;
import org.springframework.stereotype.Repository;

@Repository
public class JpaRefreshTokenRecordStore implements RefreshTokenRecordStore {

    private final RefreshTokenRecordJpaRepository repository;

    public JpaRefreshTokenRecordStore(RefreshTokenRecordJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public RefreshTokenRecord save(RefreshTokenRecord record) {
        return repository.save(record);
    }

    @Override
    public Optional<RefreshTokenRecord> findById(UUID id) {
        return repository.findById(id);
    }
}
