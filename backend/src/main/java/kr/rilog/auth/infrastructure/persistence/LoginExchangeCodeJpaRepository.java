package kr.rilog.auth.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import kr.rilog.auth.domain.LoginExchangeCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface LoginExchangeCodeJpaRepository extends JpaRepository<LoginExchangeCode, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from LoginExchangeCode c where c.id = :id")
    Optional<LoginExchangeCode> findByIdForUpdate(@Param("id") UUID id);

}
