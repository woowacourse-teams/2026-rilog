package kr.rilog.domain.comment.entity;

import jakarta.persistence.*;
import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.domain.post.entity.vo.TextRange;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.Set;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_BLOCK_NOT_COMMENTABLE;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_NOT_ACTIVE;
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
    private static final Set<String> COMMENTABLE_BLOCK_TYPES = Set.of("paragraph", "heading", "quote");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User writer;

    @Column(name = "block_id", nullable = false)
    private String blockId;

    @Embedded
    private TextRange range;

    @Column(name = "selected_text", nullable = false, columnDefinition = "text")
    private String selectedText;

    @Column(nullable = false, length = MAX_CONTENT_LENGTH)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AnchorStatus status;

    private LocalDateTime orphanedAt;

    public static CommentAnchor create(
            Post post,
            User writer,
            TextBlock block,
            TextRange range,
            String selectedText,
            String content
    ) {
        validateCommentable(block);
        validateSelectionOf(block, range, selectedText);
        validateBlockId(block.blockId());
        validateSelectedText(range, selectedText);
        validateContent(content);
        return CommentAnchor.builder()
                .post(post)
                .writer(writer)
                .blockId(block.blockId())
                .range(range)
                .selectedText(selectedText)
                .content(content)
                .status(AnchorStatus.ACTIVE)
                .build();
    }

    public void updateContent(Long requesterId, String content) {
        validateWriter(requesterId);
        validateContent(content);
        this.content = content;
    }

    public void relocate(TextRange newRange) {
        validateActive();
        validateSelectedText(newRange, selectedText);
        this.range = newRange;
    }

    public void orphan() {
        validateActive();
        this.status = AnchorStatus.ORPHANED;
        this.orphanedAt = LocalDateTime.now();
    }

    public boolean isActive() {
        return status == AnchorStatus.ACTIVE;
    }

    public boolean isOrphaned() {
        return status == AnchorStatus.ORPHANED;
    }

    public boolean isDeleted() {
        return getDeletedAt() != null;
    }

    public boolean isWrittenBy(Long userId) {
        return writer != null
                && writer.getId() != null
                && writer.getId().equals(userId);
    }

    private void validateActive() {
        if (!isActive()) {
            throw new CommentException(COMMENT_ANCHOR_NOT_ACTIVE);
        }
    }

    private void validateWriter(Long requesterId) {
        if (!isWrittenBy(requesterId)) {
            throw new CommentException(COMMENT_AUTHOR_FORBIDDEN);
        }
    }

    private static void validateCommentable(TextBlock block) {
        if (!COMMENTABLE_BLOCK_TYPES.contains(block.type())) {
            throw new CommentException(COMMENT_ANCHOR_BLOCK_NOT_COMMENTABLE);
        }
    }

    private static void validateSelectionOf(TextBlock block, TextRange range, String selectedText) {
        if (range == null || !block.slice(range).equals(selectedText)) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }
    }

    private static void validateBlockId(String blockId) {
        if (blockId == null || blockId.isBlank()) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }
    }

    private static void validateSelectedText(TextRange range, String selectedText) {
        if (range == null || selectedText == null || selectedText.isEmpty()) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }
        if (selectedText.length() != range.length()) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }
    }

    private static void validateContent(String content) {
        if (content == null || content.isBlank() || content.length() > MAX_CONTENT_LENGTH) {
            throw new CommentException(INVALID_COMMENT_CONTENT);
        }
    }

}
