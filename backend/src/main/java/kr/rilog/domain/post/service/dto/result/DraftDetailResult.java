package kr.rilog.domain.post.service.dto.result;

import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import tools.jackson.databind.JsonNode;

import java.time.LocalDateTime;

public record DraftDetailResult(

        Long draftId,
        String title,
        JsonNode content,
        PostStatus status,
        LocalDateTime publishedAt

) {

    public static DraftDetailResult from(Post draft) {
        return new DraftDetailResult(
                draft.getId(),
                draft.getTitle(),
                draft.getContent(),
                draft.getStatus(),
                draft.getPublishedAt()
        );
    }

}
