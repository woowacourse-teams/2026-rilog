package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.post.service.dto.result.DraftIdResult;

public record DraftIdResponse(
        Long draftId
) {

    public static DraftIdResponse from(DraftIdResult result) {
        return new DraftIdResponse(result.draftId());
    }

}
