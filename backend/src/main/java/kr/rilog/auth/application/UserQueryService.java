package kr.rilog.auth.application;

import kr.rilog.auth.application.port.UserStore;
import kr.rilog.domain.User;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserQueryService {

    private final UserStore userStore;

    public UserQueryService(UserStore userStore) {
        this.userStore = userStore;
    }

    @Transactional(readOnly = true)
    public User getRequired(Long userId) {
        return userStore.findById(userId)
                .orElseThrow(() -> new AuthException(
                        AuthErrorInformation.INVALID_ACCESS_TOKEN
                ));
    }

    @Transactional(readOnly = true)
    public String getRequiredSlug(Long userId) {
        String slug = getRequired(userId).getSlug();
        if (slug == null || slug.isBlank()) {
            throw new AuthException(AuthErrorInformation.USER_SLUG_NOT_ASSIGNED);
        }
        return slug;
    }

}
