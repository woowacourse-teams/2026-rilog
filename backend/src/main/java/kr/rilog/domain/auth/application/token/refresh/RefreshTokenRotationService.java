package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.token.AuthTokenPair;
import kr.rilog.domain.auth.application.token.AuthTokenPairIssuer;
import kr.rilog.domain.auth.application.port.token.RefreshSessionStore;
import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.entity.RefreshSession;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Clock;
import java.time.LocalDateTime;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.EXPIRED_REFRESH_TOKEN;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_REFRESH_TOKEN;

@Service
public class RefreshTokenRotationService {

    private final RefreshTokenHasher refreshTokenHasher;
    private final RefreshSessionStore refreshSessionStore;
    private final UserRepository userRepository;
    private final AuthTokenPairIssuer authTokenPairIssuer;
    private final Clock clock;

    @Autowired
    public RefreshTokenRotationService(
            RefreshTokenHasher refreshTokenHasher,
            RefreshSessionStore refreshSessionStore,
            UserRepository userRepository,
            AuthTokenPairIssuer authTokenPairIssuer
    ) {
        this(
                refreshTokenHasher,
                refreshSessionStore,
                userRepository,
                authTokenPairIssuer,
                Clock.systemUTC()
        );
    }

    RefreshTokenRotationService(
            RefreshTokenHasher refreshTokenHasher,
            RefreshSessionStore refreshSessionStore,
            UserRepository userRepository,
            AuthTokenPairIssuer authTokenPairIssuer,
            Clock clock
    ) {
        this.refreshTokenHasher = refreshTokenHasher;
        this.refreshSessionStore = refreshSessionStore;
        this.userRepository = userRepository;
        this.authTokenPairIssuer = authTokenPairIssuer;
        this.clock = clock;
    }

    @Transactional(noRollbackFor = AuthException.class)
    public AuthTokenPair rotate(RefreshToken refreshToken) {
        String tokenHash = refreshTokenHasher.hash(refreshToken);
        RefreshSession currentSession = refreshSessionStore.consume(tokenHash)
                .orElseThrow(() -> new AuthException(INVALID_REFRESH_TOKEN));
        LocalDateTime now = LocalDateTime.now(clock);

        if (currentSession.isExpired(now)) {
            throw new AuthException(EXPIRED_REFRESH_TOKEN);
        }

        User user = userRepository.findById(currentSession.getUserId())
                .orElseThrow(() -> new AuthException(INVALID_REFRESH_TOKEN));
        validateRefreshable(user, currentSession, now);

        return authTokenPairIssuer.issue(user);
    }

    private void validateRefreshable(User user, RefreshSession currentSession, LocalDateTime now) {
        if (user.getOnboardingStatus() != OnboardingStatus.COMPLETED || !StringUtils.hasText(user.getSlug())) {
            throw new AuthException(INVALID_REFRESH_TOKEN);
        }
    }

}
