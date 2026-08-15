package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.port.token.RefreshTokenGenerator;
import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenService;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import kr.rilog.domain.auth.entity.RefreshSession;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.auth.repository.RefreshSessionRepository;
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
import static kr.rilog.domain.auth.exception.AuthErrorInformation.REUSED_REFRESH_TOKEN;

@Service
public class RefreshTokenRotator {

    private final RefreshTokenHasher refreshTokenHasher;
    private final RefreshTokenGenerator refreshTokenGenerator;
    private final RefreshSessionRepository refreshSessionRepository;
    private final UserRepository userRepository;
    private final AccessTokenService accessTokenService;
    private final RefreshTokenProperties properties;
    private final Clock clock;

    @Autowired
    public RefreshTokenRotator(
            RefreshTokenHasher refreshTokenHasher,
            RefreshTokenGenerator refreshTokenGenerator,
            RefreshSessionRepository refreshSessionRepository,
            UserRepository userRepository,
            AccessTokenService accessTokenService,
            RefreshTokenProperties properties
    ) {
        this(
                refreshTokenHasher,
                refreshTokenGenerator,
                refreshSessionRepository,
                userRepository,
                accessTokenService,
                properties,
                Clock.systemUTC()
        );
    }

    RefreshTokenRotator(
            RefreshTokenHasher refreshTokenHasher,
            RefreshTokenGenerator refreshTokenGenerator,
            RefreshSessionRepository refreshSessionRepository,
            UserRepository userRepository,
            AccessTokenService accessTokenService,
            RefreshTokenProperties properties,
            Clock clock
    ) {
        this.refreshTokenHasher = refreshTokenHasher;
        this.refreshTokenGenerator = refreshTokenGenerator;
        this.refreshSessionRepository = refreshSessionRepository;
        this.userRepository = userRepository;
        this.accessTokenService = accessTokenService;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional(noRollbackFor = AuthException.class)
    public RefreshTokenRotationResult rotate(RefreshToken refreshToken) {
        String tokenHash = refreshTokenHasher.hash(refreshToken);
        RefreshSession currentSession = refreshSessionRepository.findByTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new AuthException(INVALID_REFRESH_TOKEN));
        LocalDateTime now = LocalDateTime.now(clock);

        if (currentSession.isRevoked()) {
            refreshSessionRepository.revokeActiveSessionsByUserId(currentSession.getUserId(), now);
            throw new AuthException(REUSED_REFRESH_TOKEN);
        }
        if (currentSession.isExpired(now)) {
            currentSession.revoke(now);
            throw new AuthException(EXPIRED_REFRESH_TOKEN);
        }

        User user = userRepository.findById(currentSession.getUserId())
                .orElseThrow(() -> new AuthException(INVALID_REFRESH_TOKEN));
        validateRefreshable(user, currentSession, now);

        AccessToken accessToken = accessTokenService.issue(
                user.getId(),
                user.getGlobalRole(),
                user.getSlug()
        );
        RefreshToken newRefreshToken = refreshTokenGenerator.generate();
        RefreshSession newSession = RefreshSession.create(
                user.getId(),
                refreshTokenHasher.hash(newRefreshToken),
                now.plus(properties.expiration())
        );

        currentSession.revoke(now);
        refreshSessionRepository.save(newSession);

        return RefreshTokenRotationResult.of(accessToken, newRefreshToken);
    }

    private void validateRefreshable(User user, RefreshSession currentSession, LocalDateTime now) {
        if (user.getOnboardingStatus() != OnboardingStatus.COMPLETED || !StringUtils.hasText(user.getSlug())) {
            currentSession.revoke(now);
            throw new AuthException(INVALID_REFRESH_TOKEN);
        }
    }
}
