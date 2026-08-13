package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.port.token.RefreshTokenGenerator;
import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import kr.rilog.domain.auth.entity.RefreshSession;
import kr.rilog.domain.auth.repository.RefreshSessionRepository;
import kr.rilog.domain.user.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
public class RefreshTokenIssuer {

    private final RefreshTokenGenerator refreshTokenGenerator;
    private final RefreshTokenHasher refreshTokenHasher;
    private final RefreshSessionRepository refreshSessionRepository;
    private final RefreshTokenProperties properties;
    private final Clock clock;

    @Autowired
    public RefreshTokenIssuer(
            RefreshTokenGenerator refreshTokenGenerator,
            RefreshTokenHasher refreshTokenHasher,
            RefreshSessionRepository refreshSessionRepository,
            RefreshTokenProperties properties
    ) {
        this(
                refreshTokenGenerator,
                refreshTokenHasher,
                refreshSessionRepository,
                properties,
                Clock.systemUTC()
        );
    }

    RefreshTokenIssuer(
            RefreshTokenGenerator refreshTokenGenerator,
            RefreshTokenHasher refreshTokenHasher,
            RefreshSessionRepository refreshSessionRepository,
            RefreshTokenProperties properties,
            Clock clock
    ) {
        this.refreshTokenGenerator = refreshTokenGenerator;
        this.refreshTokenHasher = refreshTokenHasher;
        this.refreshSessionRepository = refreshSessionRepository;
        this.properties = properties;
        this.clock = clock;
    }

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
        refreshSessionRepository.save(refreshSession);
        return refreshToken;
    }
}
