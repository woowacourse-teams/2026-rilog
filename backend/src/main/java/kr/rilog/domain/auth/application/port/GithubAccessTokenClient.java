package kr.rilog.domain.auth.application.port;

import kr.rilog.domain.auth.application.GithubAccessToken;

public interface GithubAccessTokenClient {

    GithubAccessToken exchange(String code);

}
