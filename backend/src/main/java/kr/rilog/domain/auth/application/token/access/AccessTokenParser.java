package kr.rilog.domain.auth.application.token.access;

import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import org.springframework.stereotype.Service;

@Service
public class AccessTokenParser {

    private final AccessTokenProvider accessTokenProvider;

    public AccessTokenParser(AccessTokenProvider accessTokenProvider) {
        this.accessTokenProvider = accessTokenProvider;
    }

    public AccessTokenClaims parse(String accessToken) {
        return accessTokenProvider.parse(accessToken);
    }
}
