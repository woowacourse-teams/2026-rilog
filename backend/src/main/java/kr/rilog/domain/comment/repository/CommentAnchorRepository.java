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
            JOIN FETCH anchor.commentAnchorSelection anchorSelection
            JOIN FETCH anchor.writer writer
            WHERE anchorSelection.post.id = :postId
              AND anchorSelection.deletedAt IS NULL
              AND anchor.deletedAt IS NULL
              AND writer.deletedAt IS NULL
            ORDER BY anchorSelection.createdAt ASC,
                     anchorSelection.id ASC,
                     anchor.createdAt ASC,
                     anchor.id ASC
            """)
    List<CommentAnchor> findAllByPostId(@Param("postId") Long postId);

}
