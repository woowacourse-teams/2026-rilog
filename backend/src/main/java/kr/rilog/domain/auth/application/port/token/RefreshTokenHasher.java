package kr.rilog.domain.auth.application.port.token;

import kr.rilog.domain.auth.application.token.refresh.RefreshToken;

public interface RefreshTokenHasher {

    String hash(RefreshToken refreshToken);

}
