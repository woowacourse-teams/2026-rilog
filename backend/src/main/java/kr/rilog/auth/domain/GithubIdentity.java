package kr.rilog.auth.domain;

public record GithubIdentity(
        Long githubId,
        String profileImageUrl,
        String githubUrl,
        String publicEmail
) {

    public GithubIdentity {
        if (githubId == null || githubId <= 0) {
            throw new IllegalArgumentException("githubId must be positive");
        }
    }

}
