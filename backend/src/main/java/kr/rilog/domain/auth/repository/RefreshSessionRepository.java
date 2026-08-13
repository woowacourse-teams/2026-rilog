package kr.rilog.domain.auth.repository;

import kr.rilog.domain.auth.entity.RefreshSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RefreshSessionRepository extends JpaRepository<RefreshSession, Long> {
}
