package kr.rilog.auth.application;

import java.time.Clock;
import java.time.Duration;
import kr.rilog.auth.application.port.AccessTokenCodec;
import kr.rilog.auth.application.port.IssuedCredential;
import kr.rilog.auth.application.port.LoginExchangeCodeStore;
import kr.rilog.auth.application.port.ParsedCredential;
import kr.rilog.auth.application.port.RefreshSessionStore;
import kr.rilog.auth.application.port.RefreshTokenRecordStore;
import kr.rilog.auth.application.port.SecureCredentialService;
import kr.rilog.auth.application.port.UserStore;
import kr.rilog.auth.domain.AuthDomainException;
import kr.rilog.auth.domain.AuthPrincipal;
import kr.rilog.auth.domain.LoginExchangeCode;
import kr.rilog.auth.domain.RefreshSession;
import kr.rilog.auth.domain.RefreshTokenRecord;
import kr.rilog.domain.OnboardingStatus;
import kr.rilog.domain.User;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExchangeLoginCode {

    private final LoginExchangeCodeStore exchangeCodeStore;
    private final RefreshSessionStore sessionStore;
    private final RefreshTokenRecordStore tokenRecordStore;
    private final UserStore userStore;
    private final SecureCredentialService credentialService;
    private final AccessTokenCodec accessTokenCodec;
    private final Clock clock;
    private final AuthPolicy authPolicy;

    public ExchangeLoginCode(
            LoginExchangeCodeStore exchangeCodeStore,
            RefreshSessionStore sessionStore,
            RefreshTokenRecordStore tokenRecordStore,
            UserStore userStore,
            SecureCredentialService credentialService,
            AccessTokenCodec accessTokenCodec,
            Clock clock,
            AuthPolicy authPolicy
    ) {
        this.exchangeCodeStore = exchangeCodeStore;
        this.sessionStore = sessionStore;
        this.tokenRecordStore = tokenRecordStore;
        this.userStore = userStore;
        this.credentialService = credentialService;
        this.accessTokenCodec = accessTokenCodec;
        this.clock = clock;
        this.authPolicy = authPolicy;
    }

    @Transactional
    public Result exchange(String exchangeCredential) {
        try {
            ParsedCredential parsed = credentialService.parse(exchangeCredential);
            LoginExchangeCode code = exchangeCodeStore.findByIdForUpdate(parsed.id())
                    .orElseThrow(() -> invalidExchangeCode());
            Long userId = code.consume(parsed.secretHash(), clock.instant());
            User user = userStore.findById(userId)
                    .orElseThrow(() -> invalidExchangeCode());
            IssuedCredential refresh = credentialService.issueCredential();
            RefreshSession session = RefreshSession.start(
                    userId,
                    refresh.id(),
                    clock.instant().plus(authPolicy.refreshLifetime()),
                    clock.instant()
            );
            sessionStore.save(session);
            tokenRecordStore.save(RefreshTokenRecord.issue(
                    refresh.id(),
                    session.getId(),
                    refresh.secretHash(),
                    clock.instant()
            ));
            String accessToken = accessTokenCodec.issue(
                    new AuthPrincipal(userId, user.getGlobalRole())
            );
            return new Result(
                    accessToken,
                    refresh.value(),
                    authPolicy.refreshLifetime(),
                    user.getOnboardingStatus()
            );
        } catch (AuthDomainException | IllegalArgumentException exception) {
            throw invalidExchangeCode();
        }
    }

    private AuthException invalidExchangeCode() {
        return new AuthException(AuthErrorInformation.INVALID_EXCHANGE_CODE);
    }

    public record Result(
            String accessToken,
            String refreshToken,
            Duration refreshMaxAge,
            OnboardingStatus onboardingStatus
    ) {

    }

}
