package kr.rilog.domain.comment.repository;

import kr.rilog.domain.comment.entity.CommentAnchor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentAnchorRepository extends JpaRepository<CommentAnchor, Long> {

}
