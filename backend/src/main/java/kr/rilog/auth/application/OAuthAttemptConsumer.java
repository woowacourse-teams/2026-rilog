package kr.rilog.auth.application;

import java.time.Clock;
import kr.rilog.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.auth.application.port.SecureCredentialService;
import kr.rilog.auth.domain.OAuthLoginAttempt;
import kr.rilog.auth.domain.OAuthAttemptException;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import kr.rilog.global.exception.AuthFailureReason;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OAuthAttemptConsumer {

    private final OAuthLoginAttemptStore attemptStore;
    private final SecureCredentialService credentialService;
    private final Clock clock;

    public OAuthAttemptConsumer(
            OAuthLoginAttemptStore attemptStore,
            SecureCredentialService credentialService,
            Clock clock
    ) {
        this.attemptStore = attemptStore;
        this.credentialService = credentialService;
        this.clock = clock;
    }

    @Transactional
    public String consume(String state, String browserBinding) {
        try {
            OAuthLoginAttempt attempt = attemptStore.findByStateHashForUpdate(
                            credentialService.hash(state)
                    )
                    .orElseThrow(() -> new AuthException(
                            AuthErrorInformation.INVALID_OAUTH_REQUEST,
                            AuthFailureReason.OAUTH_STATE_NOT_FOUND
                    ));
            return attempt.consume(
                    credentialService.hash(browserBinding),
                    clock.instant()
            );
        } catch (OAuthAttemptException exception) {
            throw new AuthException(
                    AuthErrorInformation.INVALID_OAUTH_REQUEST,
                    failureReason(exception.failure())
            );
        } catch (IllegalArgumentException exception) {
            throw new AuthException(
                    AuthErrorInformation.INVALID_OAUTH_REQUEST,
                    AuthFailureReason.OAUTH_REQUEST_MALFORMED
            );
        }
    }

    private AuthFailureReason failureReason(OAuthAttemptException.Failure failure) {
        return switch (failure) {
            case ALREADY_USED -> AuthFailureReason.OAUTH_ATTEMPT_ALREADY_USED;
            case EXPIRED -> AuthFailureReason.OAUTH_ATTEMPT_EXPIRED;
            case BROWSER_BINDING_MISMATCH ->
                    AuthFailureReason.OAUTH_BROWSER_BINDING_MISMATCH;
        };
    }

}
