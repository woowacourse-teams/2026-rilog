package kr.rilog.domain.auth.application;

import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.OAUTH_PROVIDER_UNSUPPORTED;

@Service
@RequiredArgsConstructor
public class OAuthLoginUserService {

    private final UserRepository userRepository;

    public User findOrCreate(SocialLoginUser socialLoginUser) {
        if (socialLoginUser.provider() != SocialLoginProvider.GITHUB) {
            throw new AuthException(OAUTH_PROVIDER_UNSUPPORTED);
        }

        Long githubId = Long.valueOf(socialLoginUser.providerUserId());
        return userRepository.findByGithubId(githubId)
                .orElseGet(() -> createGithubUser(socialLoginUser, githubId));
    }

    private User createGithubUser(SocialLoginUser socialLoginUser, Long githubId) {
        try {
            User user = User.createPendingGithubUser(
                    githubId,
                    socialLoginUser.username(),
                    socialLoginUser.profileImageUrl()
            );
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            // Another request can create the same githubId between the first lookup and save.
            return userRepository.findByGithubId(githubId)
                    .orElseThrow(() -> exception);
        }
    }
}
