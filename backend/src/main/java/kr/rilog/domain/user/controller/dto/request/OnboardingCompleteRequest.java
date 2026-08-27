package kr.rilog.domain.user.controller.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;

@Schema(description = "온보딩 완료 요청")
public record OnboardingCompleteRequest(

        @Schema(description = "사용자 닉네임", example = "러로")
        @NotBlank(message = "닉네임은 필수입니다.")
        @Size(min = 2, max = 20, message = "닉네임은 2자 이상 20자 이하이어야 합니다.")
        String nickname,

        @Schema(description = "사용자 slug (4~20자, 영문, 숫자, 하이픈(-), 언더스코어(_) 허용, 소문자로 저장)", example = "ri_log-01")
        @NotBlank(message = "슬러그는 필수입니다.")
        @Size(min = 4, max = 20, message = "슬러그는 4자 이상 20자 이하이어야 합니다.")
        @Pattern(
                regexp = "^[A-Za-z0-9_-]+$",
                message = "슬러그는 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있습니다."
        )
        String slug,

        @Schema(description = "사용자 소개", example = "기록하는 개발자입니다.")
        @Size(max = 80, message = "소개는 80자 이하여야 합니다.")
        String introduction,

        @Schema(description = "프로필 이미지 URL", example = "https://example.com/profile.png")
        @Size(max = 512, message = "프로필 이미지 URL은 512자 이하여야 합니다.")
        String profileImageUrl,

        @Schema(description = "GitHub 프로필 URL", example = "https://github.com/jinriro")
        @Size(max = 512, message = "GitHub URL은 512자 이하여야 합니다.")
        String githubUrl,

        @Schema(description = "서비스 URL", example = "https://rilog.example.com")
        @Size(max = 512, message = "서비스 URL은 512자 이하여야 합니다.")
        String serviceUrl,

        @Schema(description = "이메일", example = "riro@example.com")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        @Size(max = 256, message = "이메일은 256자 이하여야 합니다.")
        String email

) {

    public OnboardingCompleteCommand toCommand() {
        return new OnboardingCompleteCommand(nickname, slug, introduction, profileImageUrl, githubUrl, serviceUrl, email);
    }
}
