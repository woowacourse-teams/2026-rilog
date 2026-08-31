package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.comment.controller.dto.response.CommentCreateResponse;
import kr.rilog.domain.comment.controller.dto.response.CommentListResponse;
import kr.rilog.domain.comment.entity.Comment;
import kr.rilog.domain.comment.entity.enums.CommentAnchorType;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.comment.repository.CommentRepository;
import kr.rilog.domain.comment.service.dto.command.CommentCreateCommand;
import kr.rilog.domain.comment.service.dto.command.CommentUpdateCommand;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.node.JsonNodeFactory;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_AUTHOR_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long POST_ID = 1L;
    private static final Long OTHER_POST_ID = 2L;
    private static final Long USER_ID = 3L;
    private static final Long OTHER_USER_ID = 4L;
    private static final Long COMMENT_ID = 5L;
    private static final Long REPLY_ID = 6L;
    private static final Instant NOW = Instant.parse("2026-08-30T12:00:00Z");

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    private CommentService commentService;

    @BeforeEach
    void setUp() {
        commentService = new CommentService(
                commentRepository,
                postRepository,
                userRepository,
                blogMemberRepository,
                Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    @DisplayName("게시글에 루트 댓글을 작성한다")
    void createComment() {
        // given
        Post post = createPost(POST_ID);
        User author = createUser(USER_ID);
        Comment savedComment = createRootComment(COMMENT_ID, post, author, "댓글입니다.");
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(post));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(author));
        when(commentRepository.save(any(Comment.class))).thenReturn(savedComment);

        // when
        CommentCreateResponse response = commentService.createComment(
                POST_ID,
                USER_ID,
                new CommentCreateCommand("댓글입니다.")
        );

        // then
        ArgumentCaptor<Comment> commentCaptor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(commentCaptor.capture());
        Comment comment = commentCaptor.getValue();
        assertThat(comment.getPost()).isSameAs(post);
        assertThat(comment.getUser()).isSameAs(author);
        assertThat(comment.getParent()).isNull();
        assertThat(response.commentId()).isEqualTo(COMMENT_ID);
    }

    @Test
    @DisplayName("루트 댓글에 답글을 작성한다")
    void createReply() {
        // given
        Post post = createPost(POST_ID);
        User author = createUser(USER_ID);
        Comment parent = createRootComment(COMMENT_ID, post, createUser(OTHER_USER_ID), "부모 댓글입니다.");
        Comment savedReply = createReplyComment(REPLY_ID, post, author, parent, "답글입니다.");
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(post));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(author));
        when(commentRepository.findByIdAndDeletedAtIsNull(COMMENT_ID))
                .thenReturn(Optional.of(parent));
        when(commentRepository.save(any(Comment.class))).thenReturn(savedReply);

        // when
        CommentCreateResponse response = commentService.createReply(
                POST_ID,
                COMMENT_ID,
                USER_ID,
                new CommentCreateCommand("답글입니다.")
        );

        // then
        ArgumentCaptor<Comment> commentCaptor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(commentCaptor.capture());
        Comment reply = commentCaptor.getValue();
        assertThat(reply.getParent()).isSameAs(parent);
        assertThat(reply.getPost()).isSameAs(post);
        assertThat(response.commentId()).isEqualTo(REPLY_ID);
    }

    @Test
    @DisplayName("다른 게시글의 댓글에는 답글을 작성할 수 없다")
    void createReplyRejectsParentOfOtherPost() {
        // given
        Post post = createPost(POST_ID);
        Post otherPost = createPost(OTHER_POST_ID);
        User author = createUser(USER_ID);
        Comment parent = createRootComment(COMMENT_ID, otherPost, createUser(OTHER_USER_ID), "다른 게시글 댓글입니다.");
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(post));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(author));
        when(commentRepository.findByIdAndDeletedAtIsNull(COMMENT_ID))
                .thenReturn(Optional.of(parent));

        // when - then
        assertThatThrownBy(() -> commentService.createReply(
                POST_ID,
                COMMENT_ID,
                USER_ID,
                new CommentCreateCommand("답글입니다.")
        ))
                .isInstanceOf(CommentException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COMMENT_NOT_FOUND);
    }

    @Test
    @DisplayName("게시글 댓글 목록은 루트 댓글과 답글을 함께 반환한다")
    void readComments() {
        // given
        Post post = createPost(POST_ID);
        User author = createUser(USER_ID);
        Comment root = createRootComment(COMMENT_ID, post, author, "루트 댓글입니다.");
        Comment reply = createReplyComment(REPLY_ID, post, createUser(OTHER_USER_ID), root, "답글입니다.");
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(post));
        when(commentRepository.findAllByPostIdOrderByCreatedAtAscIdAsc(POST_ID))
                .thenReturn(List.of(root, reply));
        when(blogMemberRepository.findActiveUserIdsByBlogId(post.getOwnBlogId()))
                .thenReturn(List.of(USER_ID));

        // when
        CommentListResponse response = commentService.readComments(POST_ID);

        // then
        assertThat(response.comments()).hasSize(1);
        CommentListResponse.CommentResponse rootResponse = response.comments().getFirst();
        assertThat(rootResponse.commentId()).isEqualTo(COMMENT_ID);
        assertThat(rootResponse.replyCount()).isEqualTo(1);
        assertThat(rootResponse.replies()).hasSize(1);
        assertThat(rootResponse.replies().getFirst().commentId()).isEqualTo(REPLY_ID);
    }

    @Test
    @DisplayName("댓글 목록은 작성자 배지와 블로그 멤버 배지 표시 여부를 함께 반환한다")
    void readCommentsIncludesAuthorBadgeAndMemberBadge() {
        // given
        Post post = createPost(POST_ID);
        User postAuthor = post.getUser();
        User member = createUser(OTHER_USER_ID);
        Comment root = createRootComment(COMMENT_ID, post, postAuthor, "작성자 댓글입니다.");
        Comment reply = createReplyComment(REPLY_ID, post, member, root, "멤버 답글입니다.");
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(post));
        when(commentRepository.findAllByPostIdOrderByCreatedAtAscIdAsc(POST_ID))
                .thenReturn(List.of(root, reply));
        when(blogMemberRepository.findActiveUserIdsByBlogId(post.getOwnBlogId()))
                .thenReturn(List.of(postAuthor.getId(), OTHER_USER_ID));

        // when
        CommentListResponse response = commentService.readComments(POST_ID);

        // then
        CommentListResponse.CommentResponse rootResponse = response.comments().getFirst();
        CommentListResponse.ReplyResponse replyResponse = rootResponse.replies().getFirst();
        assertThat(rootResponse.author().postAuthor()).isTrue();
        assertThat(rootResponse.author().blogMember()).isTrue();
        assertThat(replyResponse.author().postAuthor()).isFalse();
        assertThat(replyResponse.author().blogMember()).isTrue();
    }

    @Test
    @DisplayName("비공개 게시글의 댓글 목록은 조회할 수 없다")
    void readCommentsRejectsPrivatePost() {
        // given
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(createPrivatePost(POST_ID)));

        // when - then
        assertThatThrownBy(() -> commentService.readComments(POST_ID))
                .isInstanceOf(PostException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(PRIVATE_POST_READ_FORBIDDEN);
    }

    @Test
    @DisplayName("삭제된 루트 댓글은 활성 답글이 있어도 목록에서 제외한다")
    void readCommentsExcludesDeletedRootWithActiveReply() {
        // given
        Post post = createPost(POST_ID);
        Comment deletedRoot = createRootComment(COMMENT_ID, post, createUser(USER_ID), "삭제된 루트 댓글입니다.");
        deletedRoot.delete();
        Comment reply = createReplyComment(REPLY_ID, post, createUser(OTHER_USER_ID), deletedRoot, "답글입니다.");
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(post));
        when(commentRepository.findAllByPostIdOrderByCreatedAtAscIdAsc(POST_ID))
                .thenReturn(List.of(deletedRoot, reply));
        when(blogMemberRepository.findActiveUserIdsByBlogId(post.getOwnBlogId()))
                .thenReturn(List.of(OTHER_USER_ID));

        // when
        CommentListResponse response = commentService.readComments(POST_ID);

        // then
        assertThat(response.comments()).isEmpty();
    }

    @Test
    @DisplayName("댓글 작성자는 댓글을 수정할 수 있다")
    void updateComment() {
        // given
        Comment comment = createRootComment(COMMENT_ID, createPost(POST_ID), createUser(USER_ID), "수정 전입니다.");
        when(commentRepository.findByIdAndDeletedAtIsNull(COMMENT_ID))
                .thenReturn(Optional.of(comment));

        // when
        commentService.updateComment(COMMENT_ID, USER_ID, new CommentUpdateCommand("수정 후입니다."));

        // then
        assertThat(comment.getContent()).isEqualTo("수정 후입니다.");
    }

    @Test
    @DisplayName("댓글 작성자가 아니면 댓글을 수정할 수 없다")
    void updateCommentRejectsNonAuthor() {
        // given
        Comment comment = createRootComment(COMMENT_ID, createPost(POST_ID), createUser(USER_ID), "수정 전입니다.");
        when(commentRepository.findByIdAndDeletedAtIsNull(COMMENT_ID))
                .thenReturn(Optional.of(comment));

        // when - then
        assertThatThrownBy(() -> commentService.updateComment(
                COMMENT_ID,
                OTHER_USER_ID,
                new CommentUpdateCommand("수정 후입니다.")
        ))
                .isInstanceOf(CommentException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COMMENT_AUTHOR_FORBIDDEN);
    }

    @Test
    @DisplayName("댓글 작성자는 댓글을 삭제할 수 있다")
    void deleteComment() {
        // given
        Comment comment = createRootComment(COMMENT_ID, createPost(POST_ID), createUser(USER_ID), "삭제 전입니다.");
        when(commentRepository.findByIdAndDeletedAtIsNull(COMMENT_ID))
                .thenReturn(Optional.of(comment));

        // when
        commentService.deleteComment(COMMENT_ID, USER_ID);

        // then
        assertThat(comment.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("루트 댓글을 삭제하면 해당 댓글의 답글도 함께 삭제한다")
    void deleteCommentDeletesRepliesWhenRootCommentDeleted() {
        // given
        Comment comment = createRootComment(COMMENT_ID, createPost(POST_ID), createUser(USER_ID), "삭제 전입니다.");
        when(commentRepository.findByIdAndDeletedAtIsNull(COMMENT_ID))
                .thenReturn(Optional.of(comment));

        // when
        commentService.deleteComment(COMMENT_ID, USER_ID);

        // then
        verify(commentRepository).softDeleteAllRepliesByParentId(
                eq(COMMENT_ID),
                eq(LocalDateTime.ofInstant(NOW, ZoneOffset.UTC))
        );
    }

    @Test
    @DisplayName("답글을 삭제할 때는 하위 답글 삭제를 시도하지 않는다")
    void deleteReplyDoesNotDeleteReplies() {
        // given
        Post post = createPost(POST_ID);
        Comment parent = createRootComment(COMMENT_ID, post, createUser(OTHER_USER_ID), "부모 댓글입니다.");
        Comment reply = createReplyComment(REPLY_ID, post, createUser(USER_ID), parent, "답글입니다.");
        when(commentRepository.findByIdAndDeletedAtIsNull(REPLY_ID))
                .thenReturn(Optional.of(reply));

        // when
        commentService.deleteComment(REPLY_ID, USER_ID);

        // then
        verify(commentRepository, never()).softDeleteAllRepliesByParentId(any(), any());
    }

    @Test
    @DisplayName("게시글이 없으면 댓글을 작성할 수 없다")
    void createCommentRejectsMissingPost() {
        // given
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> commentService.createComment(
                POST_ID,
                USER_ID,
                new CommentCreateCommand("댓글입니다.")
        ))
                .isInstanceOf(PostException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(POST_NOT_FOUND);
    }

    @Test
    @DisplayName("사용자가 없으면 댓글을 작성할 수 없다")
    void createCommentRejectsMissingUser() {
        // given
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(createPost(POST_ID)));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> commentService.createComment(
                POST_ID,
                USER_ID,
                new CommentCreateCommand("댓글입니다.")
        ))
                .isInstanceOf(UserException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(USER_NOT_FOUND);
    }

    private Comment createRootComment(Long id, Post post, User user, String content) {
        return Comment.builder()
                .id(id)
                .post(post)
                .user(user)
                .anchorType(CommentAnchorType.POST)
                .content(content)
                .createdAt(LocalDateTime.of(2026, 8, 30, 12, 0).plusMinutes(id))
                .build();
    }

    private Comment createReplyComment(Long id, Post post, User user, Comment parent, String content) {
        return Comment.builder()
                .id(id)
                .post(post)
                .user(user)
                .parent(parent)
                .anchorType(CommentAnchorType.POST)
                .content(content)
                .createdAt(LocalDateTime.of(2026, 8, 30, 12, 0).plusMinutes(id))
                .build();
    }

    private Post createPost(Long id) {
        return createPost(id, PostVisibility.PUBLIC);
    }

    private Post createPrivatePost(Long id) {
        return createPost(id, PostVisibility.PRIVATE);
    }

    private Post createPost(Long id, PostVisibility visibility) {
        User author = createUser(99L + id);
        Blog rilog = Blog.builder()
                .id(id)
                .owner(author)
                .slug(Slug.from("author-rilog-" + id))
                .profile(Profile.createRilog("작성자", "소개", null, null, null, null))
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
                .visibility(visibility)
                .build();
    }

    private User createUser(Long id) {
        return User.builder()
                .id(id)
                .githubId(id)
                .nickname(null)
                .slug(null)
                .profileImageUrl("https://example.com/profile-" + id + ".png")
                .build();
    }
}
