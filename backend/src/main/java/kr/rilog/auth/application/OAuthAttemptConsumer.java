package kr.rilog.auth.application;

import java.time.Clock;
import kr.rilog.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.auth.application.port.SecureCredentialService;
import kr.rilog.auth.domain.AuthDomainException;
import kr.rilog.auth.domain.OAuthLoginAttempt;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
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
                            AuthErrorInformation.INVALID_OAUTH_REQUEST
                    ));
            return attempt.consume(
                    credentialService.hash(browserBinding),
                    clock.instant()
            );
        } catch (AuthDomainException | IllegalArgumentException exception) {
            throw new AuthException(AuthErrorInformation.INVALID_OAUTH_REQUEST);
        }
    }
}
