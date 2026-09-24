package kr.rilog.domain.comment.entity.vo;

import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record CommentAnchorGroups(
        List<CommentAnchorGroup> values
) {

    public CommentAnchorGroups {
        values = List.copyOf(values);
    }

    public static CommentAnchorGroups from(List<CommentAnchor> commentAnchors) {
        Map<CommentAnchorSelection, List<CommentAnchor>> anchorsBySelection = new LinkedHashMap<>();
        for (CommentAnchor commentAnchor : commentAnchors) {
            anchorsBySelection.computeIfAbsent(
                    commentAnchor.getCommentAnchorSelection(),
                    ignored -> new ArrayList<>()
            ).add(commentAnchor);
        }

        List<CommentAnchorGroup> groups = new ArrayList<>();
        for (Map.Entry<CommentAnchorSelection, List<CommentAnchor>> entry : anchorsBySelection.entrySet()) {
            groups.add(new CommentAnchorGroup(entry.getKey(), entry.getValue()));
        }
        return new CommentAnchorGroups(groups);
    }

}
