package kr.rilog.domain.auth.application.token.access;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import org.springframework.stereotype.Service;

@Service
public class AccessTokenService {

    private final AccessTokenProvider accessTokenProvider;

    public AccessTokenService(AccessTokenProvider accessTokenProvider) {
        this.accessTokenProvider = accessTokenProvider;
    }

    public AccessToken issue(Long userId, GlobalRole role, String slug) {
        return accessTokenProvider.issue(userId, role, slug);
    }

    public AccessTokenClaims parse(String accessToken) {
        return accessTokenProvider.parse(accessToken);
    }
}
