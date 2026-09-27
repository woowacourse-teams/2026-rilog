package kr.rilog.domain.comment.controller.dto.response;

import kr.rilog.domain.comment.controller.dto.response.CommentAnchorListResponse.CommentAnchorResponse;
import kr.rilog.domain.comment.controller.dto.response.CommentAnchorListResponse.RangeResponse;
import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorSidebarResult;

import java.util.List;

public record CommentAnchorSidebarResponse(
        List<SidebarAnchorGroupResponse> anchorGroups
) {

    public static CommentAnchorSidebarResponse from(CommentAnchorSidebarResult result) {
        return new CommentAnchorSidebarResponse(
                result.anchorGroups().stream()
                        .map(SidebarAnchorGroupResponse::from)
                        .toList()
        );
    }

    public record SidebarAnchorGroupResponse(
            Long selectionId,
            String blockId,
            RangeResponse range,
            String selectedText,
            AnchorStatus state,
            int anchorCount,
            List<CommentAnchorResponse> commentAnchors
    ) {

        private static SidebarAnchorGroupResponse from(CommentAnchorSidebarResult.SidebarAnchorGroupResult result) {
            List<CommentAnchorResponse> data = result.commentAnchors().stream()
                    .map(CommentAnchorResponse::from)
                    .toList();
            return new SidebarAnchorGroupResponse(
                    result.selectionId(),
                    result.blockId(),
                    RangeResponse.from(result.range()),
                    result.selectedText(),
                    result.state(),
                    data.size(),
                    data
            );
        }
    }

}
