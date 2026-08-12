package kr.rilog.auth.infrastructure.persistence;

import java.util.UUID;
import kr.rilog.auth.domain.RefreshTokenRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface RefreshTokenRecordJpaRepository extends JpaRepository<RefreshTokenRecord, UUID> {

    @Query("select r.sessionId from RefreshTokenRecord r where r.id = :id")
    java.util.Optional<UUID> findSessionIdById(@Param("id") UUID id);

}
