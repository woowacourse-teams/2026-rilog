package kr.rilog.domain.blog.controller.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.blog.service.dto.command.BlogProfileUpdateCommand;

public record BlogProfileUpdateRequest(

        @Schema(description = "프로필 이미지 URL", example = "https://example.com/profile.png")
        @Size(max = 512, message = "프로필 이미지 URL은 512자 이하여야 합니다.")
        String profileImageUrl,

        @Schema(description = "커버 이미지 URL", example = "https://example.com/cover.png")
        @Size(max = 512, message = "커버 이미지 URL은 512자 이하여야 합니다.")
        String coverImageUrl,

        @Schema(description = "블로그 이름", example = "리로그 팀")
        @NotBlank(message = "블로그 이름은 필수입니다.")
        @Size(max = 20, message = "블로그 이름은 20자 이하여야 합니다.")
        String name,

        @Schema(description = "블로그 소개", example = "함께 쓰는 기술 블로그")
        @Size(max = 80, message = "블로그 소개는 80자 이하여야 합니다.")
        String introduction,

        @Schema(description = "링크", example = "https://rilog.example.com")
        @Size(max = 512, message = "링크는 512자 이하여야 합니다.")
        String serviceUrl,

        @Schema(description = "GitHub URL", example = "https://github.com/rilog")
        @Size(max = 512, message = "GitHub URL은 512자 이하여야 합니다.")
        String githubUrl,

        @Schema(description = "Email", example = "test@test.com")
        String email

) {

    public BlogProfileUpdateCommand toCommand() {
        return new BlogProfileUpdateCommand(
                profileImageUrl,
                coverImageUrl,
                name,
                introduction,
                serviceUrl,
                githubUrl,
                email
        );
    }

}
