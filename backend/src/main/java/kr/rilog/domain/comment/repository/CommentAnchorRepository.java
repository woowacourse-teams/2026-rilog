package kr.rilog.domain.comment.repository;

import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentAnchorRepository extends JpaRepository<CommentAnchor, Long> {

    @Query("""
            SELECT anchor
            FROM CommentAnchor anchor
            JOIN FETCH anchor.selection anchorSelection
            JOIN FETCH anchor.writer writer
            WHERE anchorSelection.post.id = :postId
              AND anchorSelection.selection.blockId = :blockId
              AND anchorSelection.selection.range.startOffset = :startOffset
              AND anchorSelection.selection.range.endOffset = :endOffset
              AND anchorSelection.status = :status
              AND anchorSelection.deletedAt IS NULL
              AND anchor.deletedAt IS NULL
            ORDER BY anchor.createdAt ASC, anchor.id ASC
            """)
    List<CommentAnchor> findAllBySelection(
            @Param("postId") Long postId,
            @Param("blockId") String blockId,
            @Param("startOffset") int startOffset,
            @Param("endOffset") int endOffset,
            @Param("status") AnchorStatus status
    );

}
