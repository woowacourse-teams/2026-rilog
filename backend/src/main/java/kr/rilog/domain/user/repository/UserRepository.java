package kr.rilog.domain.user.repository;

import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByGithubId(Long githubId);

    Optional<User> findByGithubId(Long githubId);

    Optional<User> findBySlugAndOnboardingStatus(String slug, OnboardingStatus onboardingStatus);

    boolean existsByNickname(String nickname);

    boolean existsBySlug(String slug);

}
