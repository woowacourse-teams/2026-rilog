package kr.rilog.domain.auth.application.token.login;

import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenService;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenService;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenIssuer;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoginTokenIssuer {

    private final OnboardingTokenService onboardingTokenService;
    private final AccessTokenService accessTokenService;
    private final RefreshTokenIssuer refreshTokenIssuer;

    public LoginTokenResult issue(User user) {
        if (user.getOnboardingStatus() == OnboardingStatus.PENDING) {
            OnboardingToken onboardingToken = onboardingTokenService.issue(user.getId());
            return new LoginTokenResult.Pending(onboardingToken);
        }

        AccessToken accessToken = accessTokenService.issue(
                user.getId(),
                user.getGlobalRole(),
                user.getSlug()
        );
        RefreshToken refreshToken = refreshTokenIssuer.issue(user);
        return new LoginTokenResult.Completed(accessToken, refreshToken);
    }
}
