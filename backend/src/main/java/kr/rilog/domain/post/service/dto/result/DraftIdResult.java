package kr.rilog.domain.post.service.dto.result;

import kr.rilog.domain.post.controller.dto.response.DraftIdResponse;

public record DraftIdResult(
        Long draftId
) {

    public static DraftIdResult from(Long draftId) {
        return new DraftIdResult(draftId);
    }

}
