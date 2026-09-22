package kr.rilog.domain.comment.service.dto.result;

import kr.rilog.domain.blog.entity.BlogMembers;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.entity.vo.CommentAnchorGroup;
import kr.rilog.domain.comment.entity.vo.CommentAnchorGroups;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.user.entity.User;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record CommentAnchorListResult(
        List<BlockResult> blocks
) {

    public static CommentAnchorListResult from(
            Post post,
            CommentAnchorGroups groups,
            BlogMembers blogMembers,
            Long requesterId
    ) {
        boolean requesterCanDeleteOthers = post.isWrittenBy(requesterId)
                || blogMembers.hasDeletePermission(requesterId);
        Map<String, List<AnchorGroupResult>> anchorGroupsByBlock = new LinkedHashMap<>();
        for (CommentAnchorGroup group : groups.values()) {
            CommentAnchorSelection anchorSelection = group.anchorSelection();
            String blockId = anchorSelection.getSelection().getBlockId();
            anchorGroupsByBlock.computeIfAbsent(blockId, ignored -> new ArrayList<>())
                    .add(AnchorGroupResult.from(
                            post,
                            group,
                            blogMembers,
                            requesterId,
                            requesterCanDeleteOthers
                    ));
        }

        List<BlockResult> blocks = new ArrayList<>();
        for (Map.Entry<String, List<AnchorGroupResult>> entry : anchorGroupsByBlock.entrySet()) {
            blocks.add(new BlockResult(entry.getKey(), List.copyOf(entry.getValue())));
        }
        return new CommentAnchorListResult(List.copyOf(blocks));
    }

    public record BlockResult(
            String blockId,
            List<AnchorGroupResult> anchorGroups
    ) {
    }

    public record AnchorGroupResult(
            Long selectionId,
            RangeResult range,
            String selectedText,
            AnchorStatus state,
            List<CommentAnchorResult> commentAnchors
    ) {

        private static AnchorGroupResult from(
                Post post,
                CommentAnchorGroup group,
                BlogMembers blogMembers,
                Long requesterId,
                boolean requesterCanDeleteOthers
        ) {
            CommentAnchorSelection anchorSelection = group.anchorSelection();
            Selection selection = anchorSelection.getSelection();
            List<CommentAnchorResult> commentAnchors = group.commentAnchors().stream()
                    .map(commentAnchor -> CommentAnchorResult.from(
                            post,
                            commentAnchor,
                            blogMembers,
                            requesterId,
                            requesterCanDeleteOthers
                    ))
                    .toList();
            return new AnchorGroupResult(
                    anchorSelection.getId(),
                    new RangeResult(
                            selection.getRange().getStartOffset(),
                            selection.getRange().getEndOffset()
                    ),
                    selection.getSelectedText(),
                    anchorSelection.getStatus(),
                    commentAnchors
            );
        }
    }

    public record RangeResult(
            int startOffset,
            int endOffset
    ) {
    }

    public record CommentAnchorResult(
            Long commentAnchorId,
            String content,
            AuthorResult author,
            boolean canEdit,
            boolean canDelete,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {

        private static CommentAnchorResult from(
                Post post,
                CommentAnchor commentAnchor,
                BlogMembers blogMembers,
                Long requesterId,
                boolean requesterCanDeleteOthers
        ) {
            boolean isWriter = commentAnchor.isWrittenBy(requesterId);
            boolean canDelete = isWriter || requesterCanDeleteOthers;
            return new CommentAnchorResult(
                    commentAnchor.getId(),
                    commentAnchor.getContent(),
                    AuthorResult.from(post, commentAnchor.getWriter(), blogMembers),
                    isWriter,
                    canDelete,
                    commentAnchor.getCreatedAt(),
                    commentAnchor.getUpdatedAt()
            );
        }
    }

    public record AuthorResult(
            Long userId,
            String nickname,
            String slug,
            String profileImageUrl,
            boolean postAuthor,
            boolean blogMember
    ) {

        private static AuthorResult from(Post post, User user, BlogMembers blogMembers) {
            return new AuthorResult(
                    user.getId(),
                    user.getNickname(),
                    user.getSlug(),
                    user.getProfileImageUrl(),
                    post.isWrittenBy(user.getId()),
                    blogMembers.isActiveMember(user.getId())
            );
        }
    }

}
