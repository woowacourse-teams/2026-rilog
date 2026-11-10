package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.comment.controller.dto.response.CommentListResponse;
import kr.rilog.domain.comment.entity.Comment;
import kr.rilog.domain.comment.entity.enums.CommentAnchorType;
import kr.rilog.domain.comment.repository.CommentRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.node.JsonNodeFactory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentQueryServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long POST_ID = 1L;
    private static final Long USER_ID = 3L;
    private static final Long OTHER_USER_ID = 4L;
    private static final Long COMMENT_ID = 5L;
    private static final Long REPLY_ID = 6L;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    private CommentQueryService commentQueryService;

    @BeforeEach
    void setUp() {
        commentQueryService = new CommentQueryService(commentRepository, postRepository, blogMemberRepository);
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
        CommentListResponse response = commentQueryService.readComments(POST_ID);

        // then
        assertThat(response.comments()).hasSize(1);
        CommentListResponse.CommentResponse rootResponse = response.comments().getFirst();
        assertThat(rootResponse.commentId()).isEqualTo(COMMENT_ID);
        assertThat(rootResponse.content()).isEqualTo("루트 댓글입니다.");
        assertThat(rootResponse.deleted()).isFalse();
        assertThat(rootResponse.replyCount()).isEqualTo(1);
        assertThat(rootResponse.replies()).hasSize(1);
        CommentListResponse.ReplyResponse replyResponse = rootResponse.replies().getFirst();
        assertThat(replyResponse.commentId()).isEqualTo(REPLY_ID);
        assertThat(replyResponse.content()).isEqualTo("답글입니다.");
        assertThat(replyResponse.author().userId()).isEqualTo(OTHER_USER_ID);
        assertThat(replyResponse.author().blogMember()).isFalse();
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
        CommentListResponse response = commentQueryService.readComments(POST_ID);

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
        assertThatThrownBy(() -> commentQueryService.readComments(POST_ID))
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
        CommentListResponse response = commentQueryService.readComments(POST_ID);

        // then
        assertThat(response.comments()).isEmpty();
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
                .slug(Slug.from("author_rilog_" + id))
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
