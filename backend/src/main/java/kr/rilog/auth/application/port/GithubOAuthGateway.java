package kr.rilog.auth.application.port;

import java.net.URI;
import kr.rilog.auth.domain.GithubIdentity;

public interface GithubOAuthGateway {

    URI buildAuthorizationUri(String state, String codeChallenge);

    GithubIdentity fetchIdentity(String code, String codeVerifier);
}
