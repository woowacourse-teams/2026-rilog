package kr.rilog.auth.application;

import java.time.Instant;
import kr.rilog.auth.application.port.IssuedCredential;
import kr.rilog.auth.application.port.ParsedCredential;
import kr.rilog.auth.application.port.RefreshSessionStore;
import kr.rilog.auth.application.port.RefreshTokenRecordStore;
import kr.rilog.auth.domain.RefreshSession;
import kr.rilog.auth.domain.RefreshTokenRecord;
import kr.rilog.auth.domain.RotationResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshRotationExecutor {

    private final RefreshSessionStore sessionStore;
    private final RefreshTokenRecordStore tokenRecordStore;
    private final AuthPolicy authPolicy;

    public RefreshRotationExecutor(
            RefreshSessionStore sessionStore,
            RefreshTokenRecordStore tokenRecordStore,
            AuthPolicy authPolicy
    ) {
        this.sessionStore = sessionStore;
        this.tokenRecordStore = tokenRecordStore;
        this.authPolicy = authPolicy;
    }

    @Transactional
    public Decision rotate(
            ParsedCredential parsed,
            IssuedCredential replacement,
            Instant now
    ) {
        java.util.UUID sessionId = tokenRecordStore.findSessionIdById(parsed.id())
                .orElse(null);
        if (sessionId == null) {
            return Decision.invalid();
        }
        RefreshSession session = sessionStore.findByIdForUpdate(sessionId)
                .orElse(null);
        if (session == null) {
            return Decision.invalid();
        }
        RefreshTokenRecord lockedRecord = tokenRecordStore.findById(parsed.id())
                .orElse(null);
        if (lockedRecord == null) {
            return Decision.invalid();
        }
        RotationResult result = session.rotate(
                lockedRecord,
                parsed.secretHash(),
                replacement.id(),
                now,
                authPolicy.refreshConcurrencyGrace()
        );
        if (result == RotationResult.ROTATED) {
            tokenRecordStore.save(RefreshTokenRecord.issue(
                    replacement.id(),
                    session.getId(),
                    replacement.secretHash(),
                    now
            ));
            sessionStore.save(session);
        } else if (result == RotationResult.REUSE_DETECTED) {
            sessionStore.save(session);
        }
        return new Decision(
                result,
                session.getUserId(),
                session.getAbsoluteExpiresAt()
        );
    }

    public record Decision(
            RotationResult result,
            Long userId,
            Instant absoluteExpiresAt
    ) {

        static Decision invalid() {
            return new Decision(RotationResult.INVALID_CREDENTIAL, null, null);
        }
    }

}
