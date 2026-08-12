package kr.rilog.auth.application.port;

import java.util.Optional;
import java.util.UUID;
import kr.rilog.auth.domain.RefreshSession;

public interface RefreshSessionStore {

    RefreshSession save(RefreshSession session);

    Optional<RefreshSession> findByIdForUpdate(UUID id);

}
