package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.application.port.token.RefreshSessionStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
public class RefreshTokenLogoutService {

    private final RefreshTokenHasher refreshTokenHasher;
    private final RefreshSessionStore refreshSessionStore;
    private final Clock clock;

    @Autowired
    public RefreshTokenLogoutService(
            RefreshTokenHasher refreshTokenHasher,
            RefreshSessionStore refreshSessionStore
    ) {
        this(refreshTokenHasher, refreshSessionStore, Clock.systemUTC());
    }

    RefreshTokenLogoutService(
            RefreshTokenHasher refreshTokenHasher,
            RefreshSessionStore refreshSessionStore,
            Clock clock
    ) {
        this.refreshTokenHasher = refreshTokenHasher;
        this.refreshSessionStore = refreshSessionStore;
        this.clock = clock;
    }

    @Transactional
    public void logout(RefreshToken refreshToken) {
        String tokenHash = refreshTokenHasher.hash(refreshToken);
        refreshSessionStore.revoke(tokenHash, LocalDateTime.now(clock));
    }

}
