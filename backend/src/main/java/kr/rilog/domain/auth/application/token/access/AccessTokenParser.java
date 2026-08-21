package kr.rilog.domain.auth.application.token.access;

import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccessTokenParser {

    private final AccessTokenProvider accessTokenProvider;

    public AccessTokenClaims parse(String accessToken) {
        return accessTokenProvider.parse(accessToken);
    }
}
