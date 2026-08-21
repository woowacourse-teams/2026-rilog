package kr.rilog.domain.auth.application.token.onboarding;

import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class OnboardingTokenServiceTest {

    @Test
    @DisplayName("Onboarding Token 발급을 provider에 위임한다")
    void issueDelegatesToOnboardingTokenProvider() {
        // given
        OnboardingTokenService onboardingTokenService = new OnboardingTokenService(new StubOnboardingTokenProvider());

        // when
        OnboardingToken onboardingToken = onboardingTokenService.issue(1L);

        // then
        assertThat(onboardingToken.value()).isEqualTo("onboarding-token:1");
    }

    @Test
    @DisplayName("Onboarding Token 파싱을 provider에 위임한다")
    void parseDelegatesToOnboardingTokenProvider() {
        // given
        OnboardingTokenService onboardingTokenService = new OnboardingTokenService(new StubOnboardingTokenProvider());

        // when
        OnboardingTokenClaims claims = onboardingTokenService.parse("onboarding-token");

        // then
        assertThat(claims)
                .extracting(
                        OnboardingTokenClaims::userId,
                        OnboardingTokenClaims::issuedAt,
                        OnboardingTokenClaims::expiresAt
                )
                .containsExactly(
                        1L,
                        Instant.parse("2026-08-13T00:00:00Z"),
                        Instant.parse("2026-08-13T00:10:00Z")
                );
    }

    private static class StubOnboardingTokenProvider implements OnboardingTokenProvider {

        @Override
        public OnboardingToken issue(Long userId) {
            return OnboardingToken.of("onboarding-token:%d".formatted(userId));
        }

        @Override
        public OnboardingTokenClaims parse(String onboardingToken) {
            return OnboardingTokenClaims.of(
                    1L,
                    Instant.parse("2026-08-13T00:00:00Z"),
                    Instant.parse("2026-08-13T00:10:00Z")
            );
        }
    }
}
