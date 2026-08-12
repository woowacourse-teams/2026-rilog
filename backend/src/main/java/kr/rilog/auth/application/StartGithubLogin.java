package kr.rilog.auth.application;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import kr.rilog.auth.application.port.GithubOAuthGateway;
import kr.rilog.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.auth.application.port.SecureCredentialService;
import kr.rilog.auth.domain.OAuthLoginAttempt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StartGithubLogin {

    private static final Duration ATTEMPT_LIFETIME = Duration.ofMinutes(10);

    private final OAuthLoginAttemptStore attemptStore;
    private final SecureCredentialService credentialService;
    private final GithubOAuthGateway githubOAuthGateway;
    private final Clock clock;

    public StartGithubLogin(
            OAuthLoginAttemptStore attemptStore,
            SecureCredentialService credentialService,
            GithubOAuthGateway githubOAuthGateway,
            Clock clock
    ) {
        this.attemptStore = attemptStore;
        this.credentialService = credentialService;
        this.githubOAuthGateway = githubOAuthGateway;
        this.clock = clock;
    }

    @Transactional
    public Result start() {
        String state = credentialService.issueSecret();
        String browserBinding = credentialService.issueSecret();
        String pkceVerifier = credentialService.issueSecret();
        OAuthLoginAttempt attempt = OAuthLoginAttempt.issue(
                credentialService.hash(state),
                credentialService.hash(browserBinding),
                pkceVerifier,
                clock.instant().plus(ATTEMPT_LIFETIME)
        );
        attemptStore.save(attempt);
        URI authorizationUri = githubOAuthGateway.buildAuthorizationUri(
                state,
                credentialService.pkceChallenge(pkceVerifier)
        );
        return new Result(authorizationUri, browserBinding);
    }

    public record Result(URI authorizationUri, String browserBinding) {
    }
}
