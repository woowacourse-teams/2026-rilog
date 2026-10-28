package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorAddCommand;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorCreateCommand;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorCreateResult;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static kr.rilog.support.fixure.PostContentFixture.PARAGRAPH_BLOCK_ID;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_CONTENT;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_COMMENT_COUNT_INVALID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommentAnchorCounterIntegrationTest extends ServiceSupport {

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
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User author;
    private Post post;

    @BeforeEach
    void preparePost() {
        author = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("댓글작성자", "counter_author"));
        Blog blog = blogRepository.saveAndFlush(Blog.createRilog(author));
        post = postRepository.saveAndFlush(PostFixture.publicPublishedRilogPostWithParagraph(blog, author, "댓글 대상 본문"));
    }

    @Test
    @DisplayName("새 선택 영역에 댓글을 작성하면 게시글의 댓글 카운터가 증가한다.")
    void creatingCommentIncrementsPostCounter() {
        // when
        CommentAnchorCreateResult result = createComment();

        // then
        assertThat(commentAnchorRepository.findById(result.commentAnchorId())).isPresent();
        assertThat(storedCount()).isEqualTo(1L);
    }

    @Test
    @DisplayName("기존 선택 영역에 댓글을 추가하면 게시글의 댓글 카운터가 증가한다.")
    void addingCommentIncrementsPostCounter() {
        // given
        CommentAnchorCreateResult first = createComment();
        Long selectionId = commentAnchorRepository.findById(first.commentAnchorId()).orElseThrow()
                .getCommentAnchorSelection().getId();

        // when
        CommentAnchorCreateResult result = commentAnchorService.addCommentAnchor(
                post.getId(), author.getId(), selectionId, new CommentAnchorAddCommand("추가 댓글"));

        // then
        assertThat(commentAnchorRepository.findById(result.commentAnchorId())).isPresent();
        assertThat(storedCount()).isEqualTo(2L);
    }

    @Test
    @DisplayName("인라인 댓글을 삭제하면 게시글의 댓글 카운터가 감소한다.")
    void deletingCommentDecrementsPostCounter() {
        // given
        CommentAnchorCreateResult comment = createComment();

        // when
        commentAnchorService.deleteCommentAnchor(post.getId(), comment.commentAnchorId(), author.getId());

        // then
        assertThat(commentAnchorRepository.findById(comment.commentAnchorId()).orElseThrow().isDeleted()).isTrue();
        assertThat(storedCount()).isZero();
    }

    @Test
    @DisplayName("선택 영역 저장 후 댓글 생성이 실패하면 선택 영역과 카운터 증가를 롤백한다.")
    void failedCreationRollsBackSelectionAndCounter() {
        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(
                post.getId(), author.getId(),
                new CommentAnchorCreateCommand(PARAGRAPH_BLOCK_ID, 0, 2, "댓글", "")
        ))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
        assertThat(storedCount()).isZero();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM comment_anchor_selection WHERE post_id = ?", Long.class, post.getId()
        )).isZero();
    }

    @Test
    @DisplayName("기존 선택 영역에 댓글 추가가 실패하면 카운터 증가를 롤백한다.")
    void failedAdditionRollsBackCounter() {
        // given
        CommentAnchorCreateResult first = createComment();
        Long selectionId = commentAnchorRepository.findById(first.commentAnchorId()).orElseThrow()
                .getCommentAnchorSelection().getId();

        // when - then
        assertThatThrownBy(() -> commentAnchorService.addCommentAnchor(
                post.getId(), author.getId(), selectionId, new CommentAnchorAddCommand("")
        ))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
        assertThat(storedCount()).isEqualTo(1L);
        assertThat(commentAnchorRepository.count()).isEqualTo(1L);
    }

    @Test
    @DisplayName("댓글 카운터가 0인 상태에서 삭제하면 음수가 되지 않고 댓글 삭제를 롤백한다.")
    void inconsistentCounterRollsBackDeletion() {
        // given
        CommentAnchorCreateResult comment = createComment();
        jdbcTemplate.update("UPDATE post SET comment_count = 0 WHERE id = ?", post.getId());

        // when - then
        assertThatThrownBy(() -> commentAnchorService.deleteCommentAnchor(
                post.getId(), comment.commentAnchorId(), author.getId()
        ))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_COMMENT_COUNT_INVALID.getMessage());
        assertThat(commentAnchorRepository.findById(comment.commentAnchorId()).orElseThrow().isDeleted()).isFalse();
        assertThat(storedCount()).isZero();
    }

    private CommentAnchorCreateResult createComment() {
        return commentAnchorService.createCommentAnchor(post.getId(), author.getId(),
                new CommentAnchorCreateCommand(PARAGRAPH_BLOCK_ID, 0, 2, "댓글", "작성한 댓글"));
    }

    private long storedCount() {
        return jdbcTemplate.queryForObject("SELECT comment_count FROM post WHERE id = ?", Long.class, post.getId());
    }
}
