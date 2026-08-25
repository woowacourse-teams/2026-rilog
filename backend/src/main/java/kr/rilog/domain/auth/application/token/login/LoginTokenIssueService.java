package kr.rilog.domain.auth.application.token.login;

import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.token.AuthTokenPair;
import kr.rilog.domain.auth.application.token.AuthTokenPairIssuer;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoginTokenIssueService {

    private final OnboardingTokenProvider onboardingTokenProvider;
    private final AuthTokenPairIssuer authTokenPairIssuer;

    public LoginTokenResult issue(User user) {
        if (user.getOnboardingStatus() == OnboardingStatus.PENDING) {
            OnboardingToken onboardingToken = onboardingTokenProvider.issue(user.getId());
            return new LoginTokenResult.Pending(onboardingToken);
        }

        AuthTokenPair pair = authTokenPairIssuer.issue(user);
        return new LoginTokenResult.Completed(pair.accessToken(), pair.refreshToken());
    }

}
