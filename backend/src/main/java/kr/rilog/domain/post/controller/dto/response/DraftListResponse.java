package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.post.service.dto.result.DraftListResult;

import java.time.LocalDateTime;
import java.util.List;

public record DraftListResponse(
        List<DraftItemResponse> drafts,
        int page,
        int size,
        int numberOfElements,
        boolean hasNext
) {

    public static DraftListResponse from(DraftListResult result) {
        return new DraftListResponse(
                result.drafts().stream()
                        .map(DraftItemResponse::from)
                        .toList(),
                result.page(),
                result.size(),
                result.numberOfElements(),
                result.hasNext()
        );
    }

    public record DraftItemResponse(
            Long draftId,
            String title,
            LocalDateTime publishedAt
    ) {

        private static DraftItemResponse from(DraftListResult.DraftItemResult result) {
            return new DraftItemResponse(result.draftId(), result.title(), result.publishedAt());
        }
    }
}
