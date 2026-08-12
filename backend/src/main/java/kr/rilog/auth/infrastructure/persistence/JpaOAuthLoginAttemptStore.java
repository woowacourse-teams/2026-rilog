package kr.rilog.auth.infrastructure.persistence;

import java.util.Optional;
import kr.rilog.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.auth.domain.OAuthLoginAttempt;
import org.springframework.stereotype.Repository;

@Repository
public class JpaOAuthLoginAttemptStore implements OAuthLoginAttemptStore {

    private final OAuthLoginAttemptJpaRepository repository;

    public JpaOAuthLoginAttemptStore(OAuthLoginAttemptJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public OAuthLoginAttempt save(OAuthLoginAttempt attempt) {
        return repository.save(attempt);
    }

    @Override
    public Optional<OAuthLoginAttempt> findByStateHashForUpdate(String stateHash) {
        return repository.findByStateHashForUpdate(stateHash);
    }

}
