package kr.rilog.auth.application;

import java.time.Clock;
import kr.rilog.auth.application.port.IssuedCredential;
import kr.rilog.auth.application.port.LoginExchangeCodeStore;
import kr.rilog.auth.application.port.SecureCredentialService;
import kr.rilog.auth.application.port.UserStore;
import kr.rilog.auth.domain.GithubIdentity;
import kr.rilog.auth.domain.LoginExchangeCode;
import kr.rilog.domain.user.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GithubIdentityRegistrar {

    private final UserStore userStore;
    private final LoginExchangeCodeStore exchangeCodeStore;
    private final SecureCredentialService credentialService;
    private final Clock clock;
    private final AuthPolicy authPolicy;

    public GithubIdentityRegistrar(
            UserStore userStore,
            LoginExchangeCodeStore exchangeCodeStore,
            SecureCredentialService credentialService,
            Clock clock,
            AuthPolicy authPolicy
    ) {
        this.userStore = userStore;
        this.exchangeCodeStore = exchangeCodeStore;
        this.credentialService = credentialService;
        this.clock = clock;
        this.authPolicy = authPolicy;
    }

    @Transactional
    public String registerAndIssueCode(GithubIdentity identity) {
        User user = userStore.findByGithubId(identity.githubId())
                .map(existing -> synchronize(existing, identity))
                .orElseGet(() -> User.registerFromGithub(identity));
        User saved = userStore.save(user);
        IssuedCredential credential = credentialService.issueCredential();
        exchangeCodeStore.save(LoginExchangeCode.issue(
                credential.id(),
                saved.getId(),
                credential.secretHash(),
                clock.instant().plus(authPolicy.exchangeCodeLifetime())
        ));
        return credential.value();
    }

    private User synchronize(User user, GithubIdentity identity) {
        user.synchronizeGithubProfile(identity);
        return user;
    }

}
