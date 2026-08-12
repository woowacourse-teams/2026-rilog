package kr.rilog.auth.application;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import kr.rilog.auth.application.port.GithubOAuthGateway;
import kr.rilog.auth.application.port.IssuedCredential;
import kr.rilog.auth.application.port.LoginExchangeCodeStore;
import kr.rilog.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.auth.application.port.SecureCredentialService;
import kr.rilog.auth.application.port.UserStore;
import kr.rilog.auth.domain.GithubIdentity;
import kr.rilog.auth.domain.LoginExchangeCode;
import kr.rilog.auth.domain.OAuthLoginAttempt;
import kr.rilog.auth.infrastructure.security.SecureCredentialManager;
import kr.rilog.domain.OnboardingStatus;
import kr.rilog.domain.User;
import org.junit.jupiter.api.Test;

class GithubLoginUseCaseTest {

    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    private static final AuthPolicy POLICY = new AuthPolicy(
            java.time.Duration.ofMinutes(10),
            java.time.Duration.ofSeconds(90),
            java.time.Duration.ofDays(30),
            java.time.Duration.ofSeconds(4)
    );

    @Test
    void startsLoginWithPersistedStatePkceAndBrowserBinding() {
        InMemoryAttemptStore attempts = new InMemoryAttemptStore();
        CapturingGithubGateway github = new CapturingGithubGateway();
        SecureCredentialService credentials = new SecureCredentialManager();
        StartGithubLogin useCase = new StartGithubLogin(
                attempts, credentials, github, CLOCK, POLICY
        );

        StartGithubLogin.Result result = useCase.start();

        assertAll(
                () -> assertTrue(result.authorizationUri().toString().contains("state=")),
                () -> assertTrue(result.authorizationUri().toString().contains("code_challenge_method=S256")),
                () -> assertFalse(result.browserBinding().isBlank()),
                () -> assertNotNull(attempts.saved)
        );
    }

    @Test
    void callbackSynchronizesOnlyGithubOwnedFieldsAndIssuesSingleUseCode() {
        SecureCredentialService credentials = new SecureCredentialManager();
        InMemoryAttemptStore attempts = new InMemoryAttemptStore();
        InMemoryUserStore users = new InMemoryUserStore();
        InMemoryExchangeCodeStore codes = new InMemoryExchangeCodeStore();
        User existing = User.builder().id(7L).githubId(123L).build();
        existing.completeOnboarding(
                "ril로그", "rilog", "intro", "old.png", "old-url", "old@email"
        );
        users.byGithubId.put(123L, existing);
        CapturingGithubGateway github = new CapturingGithubGateway();

        StartGithubLogin.Result start = new StartGithubLogin(
                attempts, credentials, github, CLOCK, POLICY
        ).start();
        CompleteGithubLogin useCase = new CompleteGithubLogin(
                new OAuthAttemptConsumer(attempts, credentials, CLOCK),
                github,
                new GithubIdentityRegistrar(users, codes, credentials, CLOCK, POLICY)
        );

        CompleteGithubLogin.Result result = useCase.complete(
                "github-code", github.state, start.browserBinding()
        );

        assertAll(
                () -> assertFalse(result.exchangeCode().isBlank()),
                () -> assertEquals("ril로그", existing.getNickname()),
                () -> assertEquals("rilog", existing.getSlug()),
                () -> assertEquals("intro", existing.getIntroduction()),
                () -> assertEquals(OnboardingStatus.COMPLETED, existing.getOnboardingStatus()),
                () -> assertEquals("new.png", existing.getProfileImageUrl()),
                () -> assertNotNull(codes.saved)
        );
    }

    private static final class CapturingGithubGateway implements GithubOAuthGateway {
        private String state;

        @Override
        public URI buildAuthorizationUri(String state, String codeChallenge) {
            this.state = state;
            return URI.create("https://github.test/oauth/authorize?state=" + state
                    + "&code_challenge=" + codeChallenge
                    + "&code_challenge_method=S256");
        }

        @Override
        public GithubIdentity fetchIdentity(String code, String codeVerifier) {
            return new GithubIdentity(123L, "new.png", "new-url", "new@email");
        }
    }

    private static final class InMemoryAttemptStore implements OAuthLoginAttemptStore {
        private OAuthLoginAttempt saved;

        @Override
        public OAuthLoginAttempt save(OAuthLoginAttempt attempt) {
            saved = attempt;
            return attempt;
        }

        @Override
        public Optional<OAuthLoginAttempt> findByStateHashForUpdate(String stateHash) {
            return saved != null && saved.getStateHash().equals(stateHash)
                    ? Optional.of(saved)
                    : Optional.empty();
        }
    }

    private static final class InMemoryUserStore implements UserStore {
        private final Map<Long, User> byGithubId = new HashMap<>();

        @Override
        public User save(User user) {
            byGithubId.put(user.getGithubId(), user);
            return user;
        }

        @Override
        public Optional<User> findById(Long id) {
            return byGithubId.values().stream().filter(user -> id.equals(user.getId())).findFirst();
        }

        @Override
        public Optional<User> findByGithubId(Long githubId) {
            return Optional.ofNullable(byGithubId.get(githubId));
        }

        @Override
        public Optional<User> findBySlug(String slug) {
            return byGithubId.values().stream().filter(user -> slug.equals(user.getSlug())).findFirst();
        }
    }

    private static final class InMemoryExchangeCodeStore implements LoginExchangeCodeStore {
        private LoginExchangeCode saved;

        @Override
        public LoginExchangeCode save(LoginExchangeCode code) {
            saved = code;
            return code;
        }

        @Override
        public Optional<LoginExchangeCode> findByIdForUpdate(UUID id) {
            return saved != null && saved.getId().equals(id) ? Optional.of(saved) : Optional.empty();
        }
    }
}
