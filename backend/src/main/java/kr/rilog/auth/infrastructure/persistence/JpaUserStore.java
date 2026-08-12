package kr.rilog.auth.infrastructure.persistence;

import java.util.Optional;
import kr.rilog.auth.application.port.UserStore;
import kr.rilog.domain.User;
import org.springframework.stereotype.Repository;

@Repository
public class JpaUserStore implements UserStore {

    private final UserJpaRepository repository;

    public JpaUserStore(UserJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public User save(User user) {
        return repository.save(user);
    }

    @Override
    public Optional<User> findById(Long id) {
        return repository.findById(id);
    }

    @Override
    public Optional<User> findByGithubId(Long githubId) {
        return repository.findByGithubId(githubId);
    }

    @Override
    public Optional<User> findBySlug(String slug) {
        return repository.findBySlug(slug);
    }
}
