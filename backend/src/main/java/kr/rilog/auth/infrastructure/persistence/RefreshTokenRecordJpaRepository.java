package kr.rilog.auth.infrastructure.persistence;

import java.util.UUID;
import kr.rilog.auth.domain.RefreshTokenRecord;
import org.springframework.data.jpa.repository.JpaRepository;

interface RefreshTokenRecordJpaRepository extends JpaRepository<RefreshTokenRecord, UUID> {
}
