package kr.rilog.domain.auth.application.token.access;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccessTokenService {

    private final AccessTokenProvider accessTokenProvider;

    public AccessToken issue(Long userId, GlobalRole role, String slug) {
        return accessTokenProvider.issue(userId, role, slug);
    }

    public AccessTokenClaims parse(String accessToken) {
        return accessTokenProvider.parse(accessToken);
    }
}
