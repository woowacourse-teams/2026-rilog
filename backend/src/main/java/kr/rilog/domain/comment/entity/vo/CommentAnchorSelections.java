package kr.rilog.domain.comment.entity.vo;

import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.domain.post.entity.vo.TextBlockDiff;
import kr.rilog.domain.post.entity.vo.TextBlocks;

import java.time.LocalDateTime;
import java.util.*;

public final class CommentAnchorSelections {

    private final Map<String, List<CommentAnchorSelection>> values;

    private CommentAnchorSelections(Map<String, List<CommentAnchorSelection>> values) {
        this.values = values;
    }

    public static CommentAnchorSelections from(Collection<CommentAnchorSelection> selections) {
        if (selections == null) {
            throw new IllegalArgumentException("CommentAnchorSelection 목록이 null입니다.");
        }

        Map<String, List<CommentAnchorSelection>> grouped = new LinkedHashMap<>();
        for (CommentAnchorSelection selection : selections) {
            if (selection == null) {
                throw new IllegalArgumentException("CommentAnchorSelection이 null입니다.");
            }

            String blockId = selection.getSelection().getBlockId();
            grouped.computeIfAbsent(
                    blockId,
                    ignored -> new ArrayList<>()
            ).add(selection);
        }

        grouped.replaceAll((blockId, values) -> List.copyOf(values));
        return new CommentAnchorSelections(Collections.unmodifiableMap(grouped));
    }

    public boolean isEmpty() {
        return values.isEmpty();
    }

    public Set<String> blockIds() {
        return Collections.unmodifiableSet(
                new LinkedHashSet<>(values.keySet())
        );
    }

    public void recalculate(PostContent previous, PostContent updated) {
        TextBlocks previousBlocks = previous.findTextBlocks(blockIds());
        TextBlocks updatedBlocks = updated.findTextBlocks(blockIds());

        values.forEach((blockId, selections) -> {
            TextBlock previousBlock = previousBlocks.find(blockId).orElse(null);
            TextBlock updatedBlock = updatedBlocks.find(blockId).orElse(null);
            if (previousBlock == null || updatedBlock == null || !updatedBlock.isCommentableBlock()) {
                orphanAll(selections);
                return;
            }

            if (previousBlock.text().equals(updatedBlock.text())) {
                return;
            }

            TextBlockDiff difference = previousBlock.calculateDifference(updatedBlock);
            for (CommentAnchorSelection selection : selections) {
                selection.recalculate(difference);
            }
        });
    }

    private void orphanAll(List<CommentAnchorSelection> orphanedSelections) {
        orphanedSelections
                .forEach(selection -> selection.orphan(LocalDateTime.now()));
    }

}
