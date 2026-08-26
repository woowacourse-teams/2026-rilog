package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.service.dto.result.DraftDetailResult;
import tools.jackson.databind.JsonNode;

import java.time.LocalDateTime;

public record DraftDetailResponse(

        Long draftId,
        String title,
        JsonNode content,
        PostStatus status,
        LocalDateTime publishedAt

) {

    public static DraftDetailResponse from(DraftDetailResult result) {
        return new DraftDetailResponse(
                result.draftId(),
                result.title(),
                result.content(),
                result.status(),
                result.publishedAt()
        );
    }

}
