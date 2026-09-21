package kr.rilog.domain.comment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_AUTHOR_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_CONTENT;

@Getter
@Entity
@Table(name = "comment_anchor")
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommentAnchor extends BaseEntity {

    private static final int MAX_CONTENT_LENGTH = 1_000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_anchor_selection_id", nullable = false)
    private CommentAnchorSelection commentAnchorSelection;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User writer;

    @Column(nullable = false, length = MAX_CONTENT_LENGTH)
    private String content;

    public static CommentAnchor create(CommentAnchorSelection commentAnchorSelection, User writer, String content) {
        validateSelection(commentAnchorSelection);
        validateContent(content);
        return CommentAnchor.builder()
                .commentAnchorSelection(commentAnchorSelection)
                .writer(writer)
                .content(content)
                .build();
    }

    public void updateContent(Long requesterId, String content) {
        validateWriter(requesterId);
        validateContent(content);
        this.content = content;
    }

    public boolean isDeleted() {
        return getDeletedAt() != null;
    }

    public boolean isWrittenBy(Long userId) {
        return writer != null
                && writer.getId() != null
                && writer.getId().equals(userId);
    }

    private void validateWriter(Long requesterId) {
        if (!isWrittenBy(requesterId)) {
            throw new CommentException(COMMENT_AUTHOR_FORBIDDEN);
        }
    }

    private static void validateSelection(CommentAnchorSelection commentAnchorSelection) {
        if (commentAnchorSelection == null) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }
    }

    private static void validateContent(String content) {
        if (content == null || content.isBlank() || content.length() > MAX_CONTENT_LENGTH) {
            throw new CommentException(INVALID_COMMENT_CONTENT);
        }
    }

}
