package kr.rilog.domain.blog.controller.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;

@Schema(description = "팀 블로그 생성 요청")
public record CologCreateRequest(

        @Schema(description = "팀 블로그 이름", example = "리로그 팀")
        @NotBlank(message = "팀 이름은 필수입니다.")
        @Size(max = 20, message = "팀 이름은 20자 이하여야 합니다.")
        String name,

        @Schema(description = "팀 블로그 slug", example = "rilog-team")
        @NotBlank(message = "팀 slug는 필수입니다.")
        @Size(max = 20, message = "팀 slug는 20자 이하여야 합니다.")
        @Pattern(regexp = "^[a-z0-9-]+$", message = "팀 slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.")
        String slug,

        @Schema(description = "팀 소개", example = "함께 쓰는 기술 블로그")
        @Size(max = 80, message = "팀 소개는 80자 이하여야 합니다.")
        String introduction,

        @Schema(description = "팀 프로필 이미지 URL", example = "https://example.com/profile.png")
        @Size(max = 512, message = "프로필 이미지 URL은 512자 이하여야 합니다.")
        String profileImageUrl,

        @Schema(description = "팀 커버 이미지 URL", example = "https://example.com/cover.png")
        @Size(max = 512, message = "커버 이미지 URL은 512자 이하여야 합니다.")
        String coverImageUrl,

        @Schema(description = "팀 서비스 URL", example = "https://rilog.example.com")
        @Size(max = 512, message = "서비스 URL은 512자 이하여야 합니다.")
        String serviceUrl,

        @Schema(description = "팀 GitHub URL", example = "https://github.com/rilog")
        @Size(max = 512, message = "GitHub URL은 512자 이하여야 합니다.")
        String githubUrl

) {

    public CologCreateCommand toCommand() {
        return new CologCreateCommand(name, slug, introduction, profileImageUrl, coverImageUrl, serviceUrl, githubUrl);
    }
}
