package kr.rilog.domain.post.controller.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import tools.jackson.databind.JsonNode;

public record PostPublishRequest(

        @NotBlank(message = "블로그 slug는 필수입니다.")
        @Size(min = 4, max = 20, message = "블로그 slug는 4자 이상 20자 이하여야 합니다.")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "블로그 slug 형식이 올바르지 않습니다.")
        String slug,

        @NotBlank(message = "제목은 필수입니다.")
        @Size(max = 512, message = "제목은 512자 이하여야 합니다.")
        String title,

        @NotNull(message = "본문은 필수입니다.")
        JsonNode content,

        @NotNull(message = "카테고리는 필수입니다.")
        Category category,

        @NotNull(message = "공개 범위는 필수입니다.")
        PostVisibility visibility,

        @Size(max = 512, message = "썸네일 이미지 URL은 512자 이하여야 합니다.")
        String thumbnailImageUrl,

        @Size(max = 512, message = "프로필 이미지 URL은 512자 이하여야 합니다.")
        String profileImageUrl

) {

    public PostSaveCommand toCommand() {
        return new PostSaveCommand(
                title,
                content,
                category,
                visibility,
                thumbnailImageUrl
        );
    }

}
