package kr.rilog.domain.comment.entity;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.node.JsonNodeFactory;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_AUTHOR_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_NOT_FOUND;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_REPLY_DEPTH_EXCEEDED;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_CONTENT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommentTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long AUTHOR_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;

    @Test
    @DisplayName("게시글에 루트 댓글을 작성한다")
    void createRootComment() {
        // given
        Post post = createPost();
        User author = createUser(AUTHOR_ID);

        // when
        Comment comment = Comment.createRoot(post, author, "첫 댓글입니다.");

        // then
        assertThat(comment.getPost()).isSameAs(post);
        assertThat(comment.getUser()).isSameAs(author);
        assertThat(comment.getParent()).isNull();
        assertThat(comment.getContent()).isEqualTo("첫 댓글입니다.");
        assertThat(comment.isReply()).isFalse();
    }

    @Test
    @DisplayName("루트 댓글에 답글을 작성한다")
    void createReplyComment() {
        // given
        Comment parent = Comment.createRoot(createPost(), createUser(AUTHOR_ID), "부모 댓글입니다.");
        User replyAuthor = createUser(OTHER_USER_ID);

        // when
        Comment reply = Comment.createReply(parent, replyAuthor, "답글입니다.");

        // then
        assertThat(reply.getPost()).isSameAs(parent.getPost());
        assertThat(reply.getUser()).isSameAs(replyAuthor);
        assertThat(reply.getParent()).isSameAs(parent);
        assertThat(reply.isReply()).isTrue();
    }

    @Test
    @DisplayName("답글에는 다시 답글을 작성할 수 없다")
    void createReplyRejectsReplyParent() {
        // given
        Comment parent = Comment.createRoot(createPost(), createUser(AUTHOR_ID), "부모 댓글입니다.");
        Comment reply = Comment.createReply(parent, createUser(OTHER_USER_ID), "답글입니다.");

        // when - then
        assertThatThrownBy(() -> Comment.createReply(reply, createUser(3L), "대댓글입니다."))
                .isInstanceOf(CommentException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COMMENT_REPLY_DEPTH_EXCEEDED);
    }

    @Test
    @DisplayName("댓글이 속한 게시글이 아니면 댓글을 찾을 수 없는 것으로 처리한다")
    void validateBelongsToRejectsOtherPost() {
        // given
        Comment comment = Comment.createRoot(createPost(1L), createUser(AUTHOR_ID), "댓글입니다.");
        Post otherPost = createPost(2L);

        // when - then
        assertThatThrownBy(() -> comment.validateBelongsTo(otherPost))
                .isInstanceOf(CommentException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COMMENT_NOT_FOUND);
    }

    @Test
    @DisplayName("댓글 내용이 1000자를 초과하면 댓글을 작성할 수 없다")
    void createRootRejectsTooLongContent() {
        // given
        String tooLongContent = "a".repeat(1_001);

        // when - then
        assertThatThrownBy(() -> Comment.createRoot(createPost(), createUser(AUTHOR_ID), tooLongContent))
                .isInstanceOf(CommentException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(INVALID_COMMENT_CONTENT);
    }

    @Test
    @DisplayName("댓글 작성자는 댓글 내용을 수정할 수 있다")
    void updateContentAllowsAuthor() {
        // given
        Comment comment = Comment.createRoot(createPost(), createUser(AUTHOR_ID), "수정 전입니다.");

        // when
        comment.updateContent(AUTHOR_ID, "수정 후입니다.");

        // then
        assertThat(comment.getContent()).isEqualTo("수정 후입니다.");
    }

    @Test
    @DisplayName("댓글 작성자가 아니면 댓글 내용을 수정할 수 없다")
    void updateContentRejectsNonAuthor() {
        // given
        Comment comment = Comment.createRoot(createPost(), createUser(AUTHOR_ID), "수정 전입니다.");

        // when - then
        assertThatThrownBy(() -> comment.updateContent(OTHER_USER_ID, "수정 후입니다."))
                .isInstanceOf(CommentException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COMMENT_AUTHOR_FORBIDDEN);
    }

    @Test
    @DisplayName("댓글 작성자는 댓글을 삭제할 수 있다")
    void deleteByAllowsAuthor() {
        // given
        Comment comment = Comment.createRoot(createPost(), createUser(AUTHOR_ID), "삭제할 댓글입니다.");

        // when
        comment.deleteBy(AUTHOR_ID);

        // then
        assertThat(comment.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("댓글 작성자가 아니면 댓글을 삭제할 수 없다")
    void deleteByRejectsNonAuthor() {
        // given
        Comment comment = Comment.createRoot(createPost(), createUser(AUTHOR_ID), "삭제할 댓글입니다.");

        // when - then
        assertThatThrownBy(() -> comment.deleteBy(OTHER_USER_ID))
                .isInstanceOf(CommentException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COMMENT_AUTHOR_FORBIDDEN);
    }

    private Post createPost() {
        return createPost(1L);
    }

    private Post createPost(Long id) {
        User author = createUser(AUTHOR_ID);
        Blog rilog = Blog.builder()
                .id(id)
                .owner(author)
                .slug(Slug.from("author-rilog-" + id))
                .profile(Profile.createRilog(
                        "작성자",
                        "소개",
                        null,
                        null,
                        null,
                        null
                ))
                .blogType(BlogType.RILOG)
                .build();

        return Post.builder()
                .id(id)
                .user(author)
                .rilog(rilog)
                .title("게시글 제목")
                .content(PostContent.from(JsonNodeFactory.instance.arrayNode()))
                .category(Category.TECH)
                .status(PostStatus.PUBLISHED)
                .visibility(PostVisibility.PUBLIC)
                .build();
    }

    private User createUser(Long id) {
        return User.builder()
                .id(id)
                .githubId(id)
                .build();
    }
}
