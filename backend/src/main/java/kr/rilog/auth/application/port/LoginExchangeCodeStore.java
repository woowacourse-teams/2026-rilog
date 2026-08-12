package kr.rilog.auth.application.port;

import java.util.Optional;
import java.util.UUID;
import kr.rilog.auth.domain.LoginExchangeCode;

public interface LoginExchangeCodeStore {

    LoginExchangeCode save(LoginExchangeCode code);

    Optional<LoginExchangeCode> findByIdForUpdate(UUID id);
}
