package kr.rilog.domain.comment.repository;

import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentAnchorSelectionRepository extends JpaRepository<CommentAnchorSelection, Long> {

    @Query("""
            SELECT anchorSelection
            FROM CommentAnchorSelection anchorSelection
            WHERE anchorSelection.post.id = :postId
              AND anchorSelection.selection.blockId = :blockId
              AND anchorSelection.selection.range.startOffset = :startOffset
              AND anchorSelection.selection.range.endOffset = :endOffset
              AND anchorSelection.selection.selectedText = :selectedText
              AND anchorSelection.status = kr.rilog.domain.comment.entity.enums.AnchorStatus.ACTIVE
              AND anchorSelection.deletedAt IS NULL
            ORDER BY anchorSelection.createdAt ASC, anchorSelection.id ASC
            """)
    List<CommentAnchorSelection> findAllActiveBySelection(
            @Param("postId") Long postId,
            @Param("blockId") String blockId,
            @Param("startOffset") int startOffset,
            @Param("endOffset") int endOffset,
            @Param("selectedText") String selectedText
    );

    @Query("""
            SELECT anchorSelection
            FROM CommentAnchorSelection anchorSelection
            WHERE anchorSelection.id = :selectionId
              AND anchorSelection.post.id = :postId
              AND anchorSelection.deletedAt IS NULL
            """)
    Optional<CommentAnchorSelection> findByIdAndPostIdAndDeletedAtIsNull(
            @Param("selectionId") Long selectionId,
            @Param("postId") Long postId
    );

    @Query("""
            SELECT anchorSelection
            FROM CommentAnchorSelection anchorSelection
            WHERE anchorSelection.post.id = :postId
              AND anchorSelection.status = kr.rilog.domain.comment.entity.enums.AnchorStatus.ACTIVE
              AND anchorSelection.deletedAt IS NULL
            ORDER BY anchorSelection.selection.blockId ASC, anchorSelection.createdAt ASC, anchorSelection.id ASC
            """)
    List<CommentAnchorSelection> findAllActiveByPostId(@Param("postId") Long postId);

}
