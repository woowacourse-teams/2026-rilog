package kr.rilog.domain.auth.application.token.onboarding;

public record OnboardingToken(
        String value
) {

    public static OnboardingToken of(String value) {
        return new OnboardingToken(value);
    }
}
