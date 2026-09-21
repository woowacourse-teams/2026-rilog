package kr.rilog.domain.comment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Embedded;
import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.TextRange;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_NOT_ACTIVE;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;

@Getter
@Entity
@Table(name = "comment_anchor_selection")
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommentAnchorSelection extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Embedded
    private Selection selection;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AnchorStatus status;

    private LocalDateTime orphanedAt;

    public static CommentAnchorSelection create(Post post, Selection selection) {
        validatePost(post);
        validateSelection(selection);
        return CommentAnchorSelection.builder()
                .post(post)
                .selection(selection)
                .status(AnchorStatus.ACTIVE)
                .build();
    }

    public void relocate(TextRange newRange) {
        validateActive();
        this.selection = selection.relocate(newRange);
    }

    public void orphan(LocalDateTime orphanedAt) {
        validateActive();
        validateOrphanedAt(orphanedAt);
        this.status = AnchorStatus.ORPHANED;
        this.orphanedAt = orphanedAt;
    }

    public boolean isActive() {
        return status == AnchorStatus.ACTIVE;
    }

    public boolean isOrphaned() {
        return status == AnchorStatus.ORPHANED;
    }

    private void validateActive() {
        if (!isActive()) {
            throw new CommentException(COMMENT_ANCHOR_NOT_ACTIVE);
        }
    }

    private static void validatePost(Post post) {
        if (post == null) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }
    }

    private static void validateSelection(Selection selection) {
        if (selection == null) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }
    }

    private static void validateOrphanedAt(LocalDateTime orphanedAt) {
        if (orphanedAt == null) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }
    }

}
