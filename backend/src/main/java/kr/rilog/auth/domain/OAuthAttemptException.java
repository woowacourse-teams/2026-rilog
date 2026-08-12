package kr.rilog.auth.domain;

public final class OAuthAttemptException extends RuntimeException {

    private final Failure failure;

    public OAuthAttemptException(Failure failure) {
        super(failure.name());
        this.failure = failure;
    }

    public Failure failure() {
        return failure;
    }

    public enum Failure {
        ALREADY_USED,
        EXPIRED,
        BROWSER_BINDING_MISMATCH
    }
}
