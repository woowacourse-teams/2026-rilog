package kr.rilog.auth.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import kr.rilog.auth.application.port.LoginExchangeCodeStore;
import kr.rilog.auth.domain.LoginExchangeCode;
import org.springframework.stereotype.Repository;

@Repository
public class JpaLoginExchangeCodeStore implements LoginExchangeCodeStore {

    private final LoginExchangeCodeJpaRepository repository;

    public JpaLoginExchangeCodeStore(LoginExchangeCodeJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public LoginExchangeCode save(LoginExchangeCode code) {
        return repository.save(code);
    }

    @Override
    public Optional<LoginExchangeCode> findByIdForUpdate(UUID id) {
        return repository.findByIdForUpdate(id);
    }

}
