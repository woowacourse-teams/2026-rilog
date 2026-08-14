package kr.rilog.domain.user.service.dto.command;

public record OnboardingCompleteCommand(
        String nickname,
        String slug,
        String introduction,
        String profileImageUrl,
        String githubUrl,
        String email
) {
}
