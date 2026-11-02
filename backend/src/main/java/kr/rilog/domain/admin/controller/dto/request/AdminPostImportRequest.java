package kr.rilog.domain.admin.controller.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Null;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import tools.jackson.databind.JsonNode;

import java.time.OffsetDateTime;

public record AdminPostImportRequest(
        @NotBlank(message = "블로그 slug는 필수입니다.")
        @Size(min = 4, max = 20, message = "블로그 slug는 4자 이상 20자 이하여야 합니다.")
        @Pattern(regexp = Slug.REGEX, message = "블로그 slug 형식이 올바르지 않습니다.")
        String slug,

        @NotBlank(message = "제목은 필수입니다.")
        @Size(max = 512, message = "제목은 512자 이하여야 합니다.")
        String title,

        @NotNull(message = "본문은 필수입니다.")
        JsonNode content,

        @NotNull(message = "카테고리는 필수입니다.")
        Category category,

        @Schema(description = "현재 플러그인은 PUBLIC을 전송하며 추후 PRIVATE도 선택할 수 있습니다.")
        @NotNull(message = "공개 범위는 필수입니다.")
        PostVisibility visibility,

        @Schema(description = "S3로 이관한 원문 썸네일의 객체 키 또는 지원하는 S3 조회 URL. 원문에 없으면 null입니다.")
        @Size(max = 512, message = "썸네일 이미지 참조는 512자 이하여야 합니다.")
        String thumbnailImageUrl,

        @Schema(description = "시간대 offset을 포함한 원문 최초 발행 일시", example = "2024-03-15T14:30:00+09:00")
        @NotNull(message = "원문 발행 일시는 필수입니다.")
        @PastOrPresent(message = "원문 발행 일시는 미래일 수 없습니다.")
        OffsetDateTime publishedAt,

        @Null(message = "이관 시 챕터는 지정할 수 없습니다.")
        Long chapterId
) {
    public PostSaveCommand toCommand() {
        return new PostSaveCommand(slug, title, content, category, visibility, thumbnailImageUrl, null);
    }
}
