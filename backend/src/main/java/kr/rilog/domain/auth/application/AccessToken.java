package kr.rilog.domain.auth.application;

public record AccessToken(
        String value
) {

    public static AccessToken of(String value) {
        return new AccessToken(value);
    }
}
