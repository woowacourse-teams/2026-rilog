package kr.rilog.domain.comment.controller.dto.response;

import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorListResult;

import java.time.LocalDateTime;
import java.util.List;

public record CommentAnchorListResponse(
        List<BlockResponse> blocks
) {

    public static CommentAnchorListResponse from(CommentAnchorListResult result) {
        return new CommentAnchorListResponse(
                result.blocks().stream()
                        .map(BlockResponse::from)
                        .toList()
        );
    }

    public record BlockResponse(
            String blockId,
            List<AnchorGroupResponse> anchorGroups
    ) {

        private static BlockResponse from(CommentAnchorListResult.BlockResult result) {
            return new BlockResponse(
                    result.blockId(),
                    result.anchorGroups().stream()
                            .map(AnchorGroupResponse::from)
                            .toList()
            );
        }
    }

    public record AnchorGroupResponse(
            RangeResponse range,
            String selectedText,
            AnchorStatus state,
            int anchorCount,
            List<CommentAnchorResponse> commentAnchors
    ) {

        private static AnchorGroupResponse from(CommentAnchorListResult.AnchorGroupResult result) {
            List<CommentAnchorResponse> data = result.commentAnchors().stream()
                    .map(CommentAnchorResponse::from)
                    .toList();
            return new AnchorGroupResponse(
                    RangeResponse.from(result.range()),
                    result.selectedText(),
                    result.state(),
                    data.size(),
                    data
            );
        }

    }

    public record RangeResponse(
            int startOffset,
            int endOffset
    ) {

        private static RangeResponse from(CommentAnchorListResult.RangeResult result) {
            return new RangeResponse(result.startOffset(), result.endOffset());
        }
    }

    public record CommentAnchorResponse(
            Long commentAnchorId,
            String content,
            AuthorResponse author,
            boolean canEdit,
            boolean canDelete,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {

        private static CommentAnchorResponse from(CommentAnchorListResult.CommentAnchorResult result) {
            return new CommentAnchorResponse(
                    result.commentAnchorId(),
                    result.content(),
                    AuthorResponse.from(result.author()),
                    result.canEdit(),
                    result.canDelete(),
                    result.createdAt(),
                    result.updatedAt()
            );
        }
    }

    public record AuthorResponse(
            Long userId,
            String nickname,
            String slug,
            String profileImageUrl,
            boolean isPostAuthor,
            boolean isBlogMember
    ) {

        private static AuthorResponse from(CommentAnchorListResult.AuthorResult result) {
            return new AuthorResponse(
                    result.userId(),
                    result.nickname(),
                    result.slug(),
                    result.profileImageUrl(),
                    result.postAuthor(),
                    result.blogMember()
            );
        }
    }

}
