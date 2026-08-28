package kr.rilog.domain.auth.application.token.refresh;

public record RefreshToken(
        String value
) {

    public static RefreshToken of(String value) {
        return new RefreshToken(value);
    }

}
