package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.controller.dto.response.CommentListResponse;
import kr.rilog.domain.comment.entity.Comment;
import kr.rilog.domain.comment.repository.CommentRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class CommentServiceIntegrationTest extends ServiceSupport {

    @Autowired
    private CommentService commentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Test
    @DisplayName("댓글 목록을 조회하면 루트 댓글 아래에 답글을 묶어서 반환한다.")
    void readCommentsGroupsRepliesUnderRootComment() {
        // given
        User writer = saveCompletedUser(100L, "작성자", "comment-writer");
        User replier = saveCompletedUser(101L, "답글작성자", "comment-replier");
        Blog rilog = saveRilog(writer);
        Post post = savePost(rilog, writer);
        Comment rootComment = commentRepository.saveAndFlush(Comment.createRoot(post, writer, "루트 댓글입니다."));
        Comment reply = commentRepository.saveAndFlush(Comment.createReply(rootComment, replier, "답글입니다."));

        // when
        CommentListResponse response = commentService.readComments(post.getId());

        // then
        CommentListResponse.CommentResponse rootResponse = response.comments().getFirst();
        CommentListResponse.ReplyResponse replyResponse = rootResponse.replies().getFirst();

        assertSoftly(softly -> {
            softly.assertThat(response.comments()).hasSize(1);
            softly.assertThat(rootResponse.commentId()).isEqualTo(rootComment.getId());
            softly.assertThat(rootResponse.content()).isEqualTo("루트 댓글입니다.");
            softly.assertThat(rootResponse.deleted()).isFalse();
            softly.assertThat(rootResponse.replyCount()).isEqualTo(1);
            softly.assertThat(replyResponse.commentId()).isEqualTo(reply.getId());
            softly.assertThat(replyResponse.content()).isEqualTo("답글입니다.");
            softly.assertThat(replyResponse.author().userId()).isEqualTo(replier.getId());
        });
    }

    @Test
    @DisplayName("삭제된 루트 댓글은 활성 답글이 있으면 삭제 상태로 반환한다.")
    void readCommentsShowsDeletedRootCommentWhenItHasActiveReply() {
        // given
        User writer = saveCompletedUser(200L, "삭제작성자", "del-writer");
        User replier = saveCompletedUser(201L, "남은답글작성자", "reply-writer");
        Blog rilog = saveRilog(writer);
        Post post = savePost(rilog, writer);
        Comment rootComment = commentRepository.saveAndFlush(Comment.createRoot(post, writer, "삭제될 댓글입니다."));
        Comment reply = commentRepository.saveAndFlush(Comment.createReply(rootComment, replier, "남아있는 답글입니다."));
        rootComment.deleteBy(writer.getId());
        commentRepository.saveAndFlush(rootComment);

        // when
        CommentListResponse response = commentService.readComments(post.getId());

        // then
        CommentListResponse.CommentResponse rootResponse = response.comments().getFirst();

        assertSoftly(softly -> {
            softly.assertThat(response.comments()).hasSize(1);
            softly.assertThat(rootResponse.commentId()).isEqualTo(rootComment.getId());
            softly.assertThat(rootResponse.content()).isNull();
            softly.assertThat(rootResponse.author()).isNull();
            softly.assertThat(rootResponse.deleted()).isTrue();
            softly.assertThat(rootResponse.replyCount()).isEqualTo(1);
            softly.assertThat(rootResponse.replies().getFirst().commentId()).isEqualTo(reply.getId());
            softly.assertThat(rootResponse.replies().getFirst().content()).isEqualTo("남아있는 답글입니다.");
        });
    }

    private User saveCompletedUser(Long githubId, String nickname, String slug) {
        User user = User.createPendingGithubUser(githubId, slug, "https://example.com/" + slug + ".png");
        user.completeOnboarding(
                nickname,
                slug,
                nickname + " 소개입니다.",
                "https://example.com/" + slug + ".png",
                "https://github.com/" + slug,
                slug + "@example.com"
        );
        return userRepository.saveAndFlush(user);
    }

    private Blog saveRilog(User owner) {
        return blogRepository.saveAndFlush(Blog.createRilog(owner, "https://rilog.example.com/" + owner.getSlug()));
    }

    private Post savePost(Blog rilog, User writer) {
        return postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, writer));
    }

}
