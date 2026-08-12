package kr.rilog.auth.application.port;

import java.util.Optional;
import java.util.UUID;
import kr.rilog.auth.domain.RefreshTokenRecord;

public interface RefreshTokenRecordStore {

    RefreshTokenRecord save(RefreshTokenRecord record);

    Optional<RefreshTokenRecord> findById(UUID id);
}
