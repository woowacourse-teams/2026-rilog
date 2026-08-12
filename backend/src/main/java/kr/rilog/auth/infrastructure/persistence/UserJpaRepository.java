package kr.rilog.auth.infrastructure.persistence;

import java.util.Optional;
import kr.rilog.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserJpaRepository extends JpaRepository<User, Long> {

    Optional<User> findByGithubId(Long githubId);

    Optional<User> findBySlug(String slug);
}
