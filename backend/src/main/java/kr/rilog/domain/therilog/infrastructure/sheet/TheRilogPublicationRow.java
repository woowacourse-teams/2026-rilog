package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.domain.therilog.entity.vo.TheRilogPublicationArticle;
import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.domain.therilog.entity.enums.TheRilogContentType.NEWS;
import static kr.rilog.domain.therilog.entity.enums.TheRilogSheetStatus.APPROVED;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_INPUT;

public record TheRilogPublicationRow(
        TheRilogSheetRow input,
        String title,
        String content,
        Spotlight spotlight,
        String postId
) {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    public boolean isDueOn(LocalDate date, Instant now) {
        if (!APPROVED.matches(input.status()) || StringUtils.hasText(postId)) {
            return false;
        }
        Instant scheduledAt = input.parseScheduledAt();
        return scheduledAt.atZone(SEOUL).toLocalDate().equals(date) && !scheduledAt.isAfter(now);
    }

    public TheRilogPublicationArticle toArticle(JsonNode blockNote) {
        input.validate();
        PostType type = NEWS.name().equals(input.contentType()) ? PostType.DAILY_HEADLINES : spotlightType();
        var metadata = type.isSpotlight()
                ? new TheRilogPostMetadata(type, spotlight.description(), spotlight.sourceProfileName(), nullable(spotlight.sourceProfileImage()))
                : new TheRilogPostMetadata(type, null, null, null);
        var detail = new PostDetail(title, blockNote, input.parseCategory(), PUBLIC,
                type.isSpotlight() ? nullable(spotlight.thumbnailImageUrl()) : null);
        return new TheRilogPublicationArticle(input.rowId(), detail, metadata);
    }

    private PostType spotlightType() {
        if (spotlight == null) {
            throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_INPUT);
        }
        return switch (spotlight.articleType()) {
            case "enterprise" -> PostType.ENTERPRISE_SPOTLIGHT;
            case "personal" -> PostType.PERSONAL_SPOTLIGHT;
            default -> throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_INPUT);
        };
    }

    private String nullable(String value) {
        return StringUtils.hasText(value) ? value : null;
    }

    public record Spotlight(
            String articleType,
            String description,
            String thumbnailImageUrl,
            String sourceProfileName,
            String sourceProfileImage
    ) {
    }
}
