package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.port.token.RefreshTokenGenerator;
import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.application.port.token.RefreshSessionStore;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import kr.rilog.domain.auth.entity.RefreshSession;
import kr.rilog.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RefreshTokenProvider {

    private final RefreshTokenGenerator refreshTokenGenerator;
    private final RefreshTokenHasher refreshTokenHasher;
    private final RefreshSessionStore refreshSessionStore;
    private final RefreshTokenProperties properties;
    private final Clock clock;

    public RefreshToken issue(User user) {
        RefreshToken refreshToken = refreshTokenGenerator.generate();
        String tokenHash = refreshTokenHasher.hash(refreshToken);
        LocalDateTime expiresAt = LocalDateTime.now(clock)
                .plus(properties.expiration());
        RefreshSession refreshSession = RefreshSession.create(
                user.getId(),
                tokenHash,
                expiresAt
        );
        refreshSessionStore.save(refreshSession, properties.expiration());
        return refreshToken;
    }

}
