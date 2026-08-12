package kr.rilog.auth.application;

import java.time.Clock;
import kr.rilog.auth.application.port.ParsedCredential;
import kr.rilog.auth.application.port.RefreshSessionStore;
import kr.rilog.auth.application.port.RefreshTokenRecordStore;
import kr.rilog.auth.application.port.SecureCredentialService;
import kr.rilog.auth.domain.RefreshSession;
import kr.rilog.auth.domain.RefreshTokenRecord;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class Logout {

    private final RefreshSessionStore sessionStore;
    private final RefreshTokenRecordStore tokenRecordStore;
    private final SecureCredentialService credentialService;
    private final Clock clock;

    public Logout(
            RefreshSessionStore sessionStore,
            RefreshTokenRecordStore tokenRecordStore,
            SecureCredentialService credentialService,
            Clock clock
    ) {
        this.sessionStore = sessionStore;
        this.tokenRecordStore = tokenRecordStore;
        this.credentialService = credentialService;
        this.clock = clock;
    }

    @Transactional
    public void logout(String refreshCredential) {
        try {
            ParsedCredential parsed = credentialService.parse(refreshCredential);
            java.util.UUID sessionId = tokenRecordStore.findSessionIdById(parsed.id())
                    .orElseThrow(this::invalidRefreshToken);
            RefreshSession session = sessionStore.findByIdForUpdate(sessionId)
                    .orElseThrow(this::invalidRefreshToken);
            RefreshTokenRecord lockedRecord = tokenRecordStore.findById(parsed.id())
                    .orElseThrow(this::invalidRefreshToken);
            if (!session.getId().equals(lockedRecord.getSessionId())
                    || !lockedRecord.matches(parsed.secretHash())) {
                throw invalidRefreshToken();
            }
            session.revoke(clock.instant());
            sessionStore.save(session);
        } catch (IllegalArgumentException exception) {
            throw invalidRefreshToken();
        }
    }

    private AuthException invalidRefreshToken() {
        return new AuthException(AuthErrorInformation.INVALID_REFRESH_TOKEN);
    }
}
