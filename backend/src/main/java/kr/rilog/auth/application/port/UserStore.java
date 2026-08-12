package kr.rilog.auth.application.port;

import java.util.Optional;
import kr.rilog.domain.User;

public interface UserStore {

    User save(User user);

    Optional<User> findById(Long id);

    Optional<User> findByGithubId(Long githubId);

    Optional<User> findBySlug(String slug);

}
