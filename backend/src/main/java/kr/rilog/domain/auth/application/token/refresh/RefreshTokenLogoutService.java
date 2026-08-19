package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.repository.RefreshSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
public class RefreshTokenLogoutService {

    private final RefreshTokenHasher refreshTokenHasher;
    private final RefreshSessionRepository refreshSessionRepository;
    private final Clock clock;

    @Autowired
    public RefreshTokenLogoutService(
            RefreshTokenHasher refreshTokenHasher,
            RefreshSessionRepository refreshSessionRepository
    ) {
        this(refreshTokenHasher, refreshSessionRepository, Clock.systemUTC());
    }

    RefreshTokenLogoutService(
            RefreshTokenHasher refreshTokenHasher,
            RefreshSessionRepository refreshSessionRepository,
            Clock clock
    ) {
        this.refreshTokenHasher = refreshTokenHasher;
        this.refreshSessionRepository = refreshSessionRepository;
        this.clock = clock;
    }

    @Transactional
    public void logout(RefreshToken refreshToken) {
        String tokenHash = refreshTokenHasher.hash(refreshToken);
        refreshSessionRepository.findByTokenHashForUpdate(tokenHash)
                .ifPresent(refreshSession -> refreshSession.revoke(LocalDateTime.now(clock)));
    }
}
