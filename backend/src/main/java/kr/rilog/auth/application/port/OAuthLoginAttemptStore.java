package kr.rilog.auth.application.port;

import java.util.Optional;
import kr.rilog.auth.domain.OAuthLoginAttempt;

public interface OAuthLoginAttemptStore {

    OAuthLoginAttempt save(OAuthLoginAttempt attempt);

    Optional<OAuthLoginAttempt> findByStateHashForUpdate(String stateHash);

}
