package kr.rilog.auth.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import kr.rilog.auth.domain.OAuthLoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface OAuthLoginAttemptJpaRepository extends JpaRepository<OAuthLoginAttempt, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from OAuthLoginAttempt a where a.stateHash = :stateHash")
    Optional<OAuthLoginAttempt> findByStateHashForUpdate(@Param("stateHash") String stateHash);

}
