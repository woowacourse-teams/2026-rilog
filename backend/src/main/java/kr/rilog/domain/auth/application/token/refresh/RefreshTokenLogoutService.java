package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.application.port.token.RefreshSessionStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RefreshTokenLogoutService {

    private final RefreshTokenHasher refreshTokenHasher;
    private final RefreshSessionStore refreshSessionStore;
    private final Clock clock;

    @Transactional
    public void logout(RefreshToken refreshToken) {
        String tokenHash = refreshTokenHasher.hash(refreshToken);
        refreshSessionStore.revoke(tokenHash, LocalDateTime.now(clock));
    }

}
