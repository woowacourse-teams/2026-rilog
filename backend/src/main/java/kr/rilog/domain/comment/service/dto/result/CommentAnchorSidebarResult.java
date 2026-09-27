package kr.rilog.domain.comment.service.dto.result;

import kr.rilog.domain.blog.entity.BlogMembers;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.entity.vo.CommentAnchorGroup;
import kr.rilog.domain.comment.entity.vo.CommentAnchorGroups;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorListResult.CommentAnchorResult;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorListResult.RangeResult;
import kr.rilog.domain.post.entity.Post;

import java.util.List;

public record CommentAnchorSidebarResult(
        List<SidebarAnchorGroupResult> anchorGroups
) {

    public static CommentAnchorSidebarResult from(
            Post post,
            CommentAnchorGroups groups,
            BlogMembers blogMembers,
            Long requesterId
    ) {
        return new CommentAnchorSidebarResult(
                groups.values().stream()
                        .map(group -> SidebarAnchorGroupResult.from(post, group, blogMembers, requesterId))
                        .toList()
        );
    }

    public record SidebarAnchorGroupResult(
            Long selectionId,
            String blockId,
            RangeResult range,
            String selectedText,
            AnchorStatus state,
            List<CommentAnchorResult> commentAnchors
    ) {

        private static SidebarAnchorGroupResult from(
                Post post,
                CommentAnchorGroup group,
                BlogMembers blogMembers,
                Long requesterId
        ) {
            CommentAnchorSelection anchorSelection = group.anchorSelection();
            Selection selection = anchorSelection.getSelection();
            List<CommentAnchorResult> commentAnchors = group.commentAnchors().stream()
                    .map(commentAnchor -> CommentAnchorResult.from(
                            post,
                            commentAnchor,
                            blogMembers,
                            requesterId
                    ))
                    .toList();
            return new SidebarAnchorGroupResult(
                    anchorSelection.getId(),
                    selection.getBlockId(),
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

}
