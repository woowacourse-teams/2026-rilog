package kr.rilog.domain.auth.application.token.access;

public record AccessToken(
        String value
) {

    public static AccessToken of(String value) {
        return new AccessToken(value);
    }
}
