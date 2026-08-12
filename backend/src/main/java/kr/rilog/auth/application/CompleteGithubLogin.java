package kr.rilog.auth.application;

import kr.rilog.auth.application.port.GithubOAuthGateway;
import kr.rilog.auth.domain.GithubIdentity;
import org.springframework.stereotype.Service;

@Service
public class CompleteGithubLogin {

    private final OAuthAttemptConsumer attemptConsumer;
    private final GithubOAuthGateway githubOAuthGateway;
    private final GithubIdentityRegistrar identityRegistrar;

    public CompleteGithubLogin(
            OAuthAttemptConsumer attemptConsumer,
            GithubOAuthGateway githubOAuthGateway,
            GithubIdentityRegistrar identityRegistrar
    ) {
        this.attemptConsumer = attemptConsumer;
        this.githubOAuthGateway = githubOAuthGateway;
        this.identityRegistrar = identityRegistrar;
    }

    public Result complete(String code, String state, String browserBinding) {
        String verifier = attemptConsumer.consume(state, browserBinding);
        GithubIdentity identity = githubOAuthGateway.fetchIdentity(code, verifier);
        String exchangeCode = identityRegistrar.registerAndIssueCode(identity);
        return new Result(exchangeCode);
    }

    public record Result(String exchangeCode) {
    }
}
