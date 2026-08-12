package kr.rilog.auth.application;

import java.time.Clock;
import java.time.Duration;
import kr.rilog.auth.application.port.AccessTokenCodec;
import kr.rilog.auth.application.port.IssuedCredential;
import kr.rilog.auth.application.port.ParsedCredential;
import kr.rilog.auth.application.port.SecureCredentialService;
import kr.rilog.auth.application.port.UserStore;
import kr.rilog.auth.domain.AuthPrincipal;
import kr.rilog.auth.domain.RotationResult;
import kr.rilog.domain.User;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.springframework.stereotype.Service;

@Service
public class RefreshLoginSession {

    private final RefreshRotationExecutor rotationExecutor;
    private final UserStore userStore;
    private final SecureCredentialService credentialService;
    private final AccessTokenCodec accessTokenCodec;
    private final Clock clock;

    public RefreshLoginSession(
            RefreshRotationExecutor rotationExecutor,
            UserStore userStore,
            SecureCredentialService credentialService,
            AccessTokenCodec accessTokenCodec,
            Clock clock
    ) {
        this.rotationExecutor = rotationExecutor;
        this.userStore = userStore;
        this.credentialService = credentialService;
        this.accessTokenCodec = accessTokenCodec;
        this.clock = clock;
    }

    public Result refresh(String refreshCredential) {
        ParsedCredential parsed;
        try {
            parsed = credentialService.parse(refreshCredential);
        } catch (IllegalArgumentException exception) {
            throw invalidRefreshToken();
        }
        IssuedCredential replacement = credentialService.issueCredential();
        RefreshRotationExecutor.Decision decision = rotationExecutor.rotate(
                parsed, replacement, clock.instant()
        );
        if (decision.result() != RotationResult.ROTATED
                && decision.result() != RotationResult.CONCURRENT_REQUEST) {
            throw invalidRefreshToken();
        }
        User user = userStore.findById(decision.userId())
                .orElseThrow(this::invalidRefreshToken);
        String accessToken = accessTokenCodec.issue(
                new AuthPrincipal(user.getId(), user.getGlobalRole())
        );
        if (decision.result() == RotationResult.CONCURRENT_REQUEST) {
            return new Result(accessToken, null, null);
        }
        Duration remaining = Duration.between(
                clock.instant(), decision.absoluteExpiresAt()
        );
        return new Result(accessToken, replacement.value(), remaining);
    }

    private AuthException invalidRefreshToken() {
        return new AuthException(AuthErrorInformation.INVALID_REFRESH_TOKEN);
    }

    public record Result(
            String accessToken,
            String refreshToken,
            Duration refreshMaxAge
    ) {

    }

}
