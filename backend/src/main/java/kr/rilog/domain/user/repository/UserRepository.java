package kr.rilog.domain.user.repository;

import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.blog.entity.Slug;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByGithubId(Long githubId);

    Optional<User> findByGithubId(Long githubId);

    Optional<User> findBySlugAndOnboardingStatus(Slug slug, OnboardingStatus onboardingStatus);

    boolean existsByNickname(Nickname nickname);

    boolean existsBySlug(Slug slug);

}
