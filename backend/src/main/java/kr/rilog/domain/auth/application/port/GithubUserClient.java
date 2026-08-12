package kr.rilog.domain.auth.application.port;

import kr.rilog.domain.auth.application.GithubOAuthUser;

public interface GithubUserClient {

    GithubOAuthUser getUser(String accessToken);

}
