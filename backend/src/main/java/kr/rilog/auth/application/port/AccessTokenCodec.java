package kr.rilog.auth.application.port;

import kr.rilog.auth.domain.AuthPrincipal;

public interface AccessTokenCodec {

    String issue(AuthPrincipal principal);

    AuthPrincipal verify(String token);

}
