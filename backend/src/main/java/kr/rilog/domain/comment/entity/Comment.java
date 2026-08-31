package kr.rilog.domain.comment.entity;

import jakarta.persistence.*;
import kr.rilog.domain.comment.entity.enums.CommentAnchorType;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.Objects;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_AUTHOR_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_NOT_FOUND;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_REPLY_DEPTH_EXCEEDED;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_CONTENT;

@Getter
@Entity
@Table(name = "comment")
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Comment extends BaseEntity {

    private static final int MAX_CONTENT_LENGTH = 1_000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CommentAnchorType anchorType;

    @Column(nullable = false, length = MAX_CONTENT_LENGTH)
    private String content;

    public static Comment createRoot(Post post, User user, String content) {
        validateContent(content);
        return Comment.builder()
                .post(post)
                .user(user)
                .anchorType(CommentAnchorType.POST)
                .content(content)
                .build();
    }

    public static Comment createReply(Comment parent, User user, String content) {
        parent.validateRoot();
        validateContent(content);
        return Comment.builder()
                .post(parent.post)
                .user(user)
                .parent(parent)
                .anchorType(CommentAnchorType.POST)
                .content(content)
                .build();
    }

    public void updateContent(Long requesterId, String content) {
        validateAuthor(requesterId);
        validateContent(content);
        this.content = content;
    }

    public void deleteBy(Long requesterId) {
        validateAuthor(requesterId);
        delete();
    }

    public boolean isReply() {
        return parent != null;
    }

    public boolean isDeleted() {
        return getDeletedAt() != null;
    }

    public void validateBelongsTo(Post targetPost) {
        if (!belongsTo(targetPost)) {
            throw new CommentException(COMMENT_NOT_FOUND);
        }
    }

    private boolean belongsTo(Post targetPost) {
        if (post == null || targetPost == null) {
            return false;
        }

        if (post == targetPost) {
            return true;
        }

        return post.getId() != null
                && targetPost.getId() != null
                && Objects.equals(post.getId(), targetPost.getId());
    }

    private void validateRoot() {
        if (isReply()) {
            throw new CommentException(COMMENT_REPLY_DEPTH_EXCEEDED);
        }
    }

    private void validateAuthor(Long requesterId) {
        if (requesterId == null || user == null || user.getId() == null || !user.getId().equals(requesterId)) {
            throw new CommentException(COMMENT_AUTHOR_FORBIDDEN);
        }
    }

    private static void validateContent(String content) {
        if (content == null || content.isBlank() || content.length() > MAX_CONTENT_LENGTH) {
            throw new CommentException(INVALID_COMMENT_CONTENT);
        }
    }
}
