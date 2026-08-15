package kr.rilog.domain.auth.repository;

import jakarta.persistence.LockModeType;
import kr.rilog.domain.auth.entity.RefreshSession;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RefreshSessionRepository extends JpaRepository<RefreshSession, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select refreshSession from RefreshSession refreshSession where refreshSession.tokenHash = :tokenHash")
    Optional<RefreshSession> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    @Modifying
    @Query("""
            update RefreshSession refreshSession
            set refreshSession.revokedAt = :revokedAt
            where refreshSession.userId = :userId
              and refreshSession.revokedAt is null
            """)
    int revokeActiveSessionsByUserId(
            @Param("userId") Long userId,
            @Param("revokedAt") LocalDateTime revokedAt
    );
}
