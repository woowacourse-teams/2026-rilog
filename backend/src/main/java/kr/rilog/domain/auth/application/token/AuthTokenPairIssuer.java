package kr.rilog.domain.auth.application.token;

import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenIssuer;
import kr.rilog.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthTokenPairIssuer {

    private final AccessTokenProvider accessTokenProvider;
    private final RefreshTokenIssuer refreshTokenIssuer;

    public AuthTokenPair issue(User user) {
        AccessToken accessToken = accessTokenProvider.issue(
                user.getId(),
                user.getGlobalRole(),
                user.getSlug()
        );
        RefreshToken refreshToken = refreshTokenIssuer.issue(user);
        return new AuthTokenPair(accessToken, refreshToken);
    }

}
