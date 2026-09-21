package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorCreateCommand;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorCreateResult;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.domain.post.exception.PostErrorInformation.TEXT_BLOCK_NOT_FOUND;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static kr.rilog.support.fixure.PostContentFixture.PARAGRAPH_BLOCK_ID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/*
 * TODO: CommentAnchorSelection 엔티티 기반 생성 API 구현 시 통합 테스트를 함께 복구한다.
class CommentAnchorServiceIntegrationTest extends ServiceSupport {

    private static final String PARAGRAPH_TEXT = "가나나다다라마";
    private static final int SELECTED_START = 2;
    private static final int SELECTED_END = 4;
    private static final String SELECTED_TEXT = "나다";
    private static final String CONTENT = "좋은 설명이에요.";

    @Autowired
    private CommentAnchorService commentAnchorService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentAnchorRepository commentAnchorRepository;

    @Test
    @DisplayName("공개 게시글에 작성자가 아닌 로그인 사용자가 인라인 댓글을 작성하면 선택 위치와 본문을 저장한다.")
    void createCommentAnchorPersistsSelectionAndContent() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);

        // when
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand());
        CommentAnchor saved = commentAnchorRepository.findById(result.commentAnchorId()).orElseThrow();

        // then
        CommentAnchorSelection expectedSelection = CommentAnchorSelection.of(
                PARAGRAPH_BLOCK_ID,
                SELECTED_START,
                SELECTED_END,
                SELECTED_TEXT
        );
        assertThat(saved.getSelection()).isEqualTo(expectedSelection);
        assertThat(saved.getContent()).isEqualTo(CONTENT);
    }

    @Test
    @DisplayName("인라인 댓글을 작성하면 요청한 게시글과 요청자가 작성자로 저장된다.")
    void createCommentAnchorAssociatesPostAndWriter() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);

        // when
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand());
        CommentAnchor saved = commentAnchorRepository.findById(result.commentAnchorId()).orElseThrow();

        // then
        assertThat(saved.getPost().getId()).isEqualTo(post.getId());
        assertThat(saved.getWriter().getId()).isEqualTo(commenter.getId());
    }

    @Test
    @DisplayName("인라인 댓글을 작성하면 ACTIVE 상태로 저장된다.")
    void createCommentAnchorPersistsActiveStatus() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);

        // when
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand());
        CommentAnchor saved = commentAnchorRepository.findById(result.commentAnchorId()).orElseThrow();

        // then
        assertThat(saved.getStatus()).isEqualTo(AnchorStatus.ACTIVE);
    }

    @Test
    @DisplayName("비공개 게시글의 작성자는 자기 게시글에 인라인 댓글을 작성할 수 있다.")
    void createCommentAnchorAllowsPostWriterOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Post post = savePrivatePost(postWriter);

        // when
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), postWriter.getId(), selectedCommand());

        // then
        assertThat(commentAnchorRepository.findById(result.commentAnchorId())).isPresent();
    }

    @Test
    @DisplayName("비공개 게시글에는 작성자가 아닌 사용자가 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsOtherUserOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePrivatePost(postWriter);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand()))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("발행되지 않은 게시글에는 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsDraftPost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Blog rilog = saveRilog(postWriter);
        Post draft = postRepository.saveAndFlush(PostFixture.publicDraftRilogPost(rilog, postWriter));

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(
                draft.getId(), postWriter.getId(), selectedCommand()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("삭제된 게시글에는 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsDeletedPost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Blog rilog = saveRilog(postWriter);
        Post deleted = postRepository.saveAndFlush(PostFixture.deletedPublicPublishedRilogPost(rilog, postWriter));

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(
                deleted.getId(), postWriter.getId(), selectedCommand()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("존재하지 않는 사용자는 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsUnknownUser() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Post post = savePublicPost(postWriter);
        Long unknownUserId = Long.MAX_VALUE;

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(
                post.getId(), unknownUserId, selectedCommand()))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("본문에 없는 블록 id이면 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsUnknownBlockId() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Post post = savePublicPost(postWriter);
        var command = new CommentAnchorCreateCommand(
                "not-exists", SELECTED_START, SELECTED_END, SELECTED_TEXT, CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(post.getId(), postWriter.getId(), command))
                .isInstanceOf(PostException.class)
                .hasMessage(TEXT_BLOCK_NOT_FOUND.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("선택 문자열이 서버가 직렬화한 블록 텍스트의 해당 범위와 다르면 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsSelectedTextDifferentFromServerText() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Post post = savePublicPost(postWriter);
        var command = new CommentAnchorCreateCommand(
                PARAGRAPH_BLOCK_ID, SELECTED_START, SELECTED_END, "가나", CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(post.getId(), postWriter.getId(), command))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    private CommentAnchorCreateCommand selectedCommand() {
        return new CommentAnchorCreateCommand(PARAGRAPH_BLOCK_ID, SELECTED_START, SELECTED_END, SELECTED_TEXT, CONTENT);
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

    private Post savePublicPost(User writer) {
        Blog rilog = saveRilog(writer);
        return postRepository.saveAndFlush(
                PostFixture.publicPublishedRilogPostWithParagraph(rilog, writer, PARAGRAPH_TEXT));
    }

    private Post savePrivatePost(User writer) {
        Blog rilog = saveRilog(writer);
        return postRepository.saveAndFlush(
                PostFixture.privatePublishedRilogPostWithParagraph(rilog, writer, PARAGRAPH_TEXT));
    }

}
*/
