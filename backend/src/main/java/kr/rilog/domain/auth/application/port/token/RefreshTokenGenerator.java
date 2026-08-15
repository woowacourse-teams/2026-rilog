package kr.rilog.domain.auth.application.port.token;

import kr.rilog.domain.auth.application.token.refresh.RefreshToken;

public interface RefreshTokenGenerator {

    RefreshToken generate();
}
