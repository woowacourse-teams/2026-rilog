package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorAddCommand;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorCreateCommand;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorCreateResult;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.IntFunction;
import java.util.stream.IntStream;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_NOT_FOUND;
import static kr.rilog.support.fixure.PostContentFixture.PARAGRAPH_BLOCK_ID;
import static org.assertj.core.api.Assertions.assertThat;

@Tag("mysql")
@Timeout(60)
class CommentAnchorCounterConcurrencyIntegrationTest extends ServiceSupport {

    private static final String PARAGRAPH_TEXT = "가나다라마바사아자차카타파하";
    private static final String CONTENT = "동시에 작성한 인라인 댓글";
    private static final int CONCURRENT_REQUESTS = 8;

    @Autowired
    private CommentAnchorService commentAnchorService;

    @Autowired
    private CommentAnchorRepository commentAnchorRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("같은 게시글의 서로 다른 위치에 댓글을 동시에 작성해도 카운터는 저장된 댓글 수와 일치한다.")
    void concurrentNewSelectionsPreserveCommentCount() throws Exception {
        // given
        PostScenario scenario = publicPost();

        // when
        concurrently(CONCURRENT_REQUESTS, index -> commentAnchorService.createCommentAnchor(
                scenario.post().getId(), scenario.writer().getId(), selectedCommand(index)
        ));

        // then
        assertThat(commentCounts(scenario.post().getId()))
                .isEqualTo(new CommentCounts(CONCURRENT_REQUESTS, CONCURRENT_REQUESTS));
    }

    @Test
    @DisplayName("같은 선택 영역에 댓글을 동시에 추가해도 카운터는 저장된 댓글 수와 일치한다.")
    void concurrentRepliesPreserveCommentCount() throws Exception {
        // given
        PostScenario scenario = publicPost();
        CommentAnchorCreateResult first = createComment(scenario);
        Long selectionId = selectionId(first.commentAnchorId());

        // when
        concurrently(CONCURRENT_REQUESTS, index -> commentAnchorService.addCommentAnchor(
                scenario.post().getId(), scenario.writer().getId(), selectionId,
                new CommentAnchorAddCommand(CONTENT)
        ));

        // then
        long expectedCount = CONCURRENT_REQUESTS + 1L;
        assertThat(commentCounts(scenario.post().getId()))
                .isEqualTo(new CommentCounts(expectedCount, expectedCount));
    }

    @Test
    @DisplayName("서로 다른 댓글을 동시에 삭제하면 삭제한 댓글 수만큼 카운터가 감소한다.")
    void concurrentDistinctDeletesPreserveCommentCount() throws Exception {
        // given
        PostScenario scenario = publicPost();
        List<Long> commentIds = comments(scenario, CONCURRENT_REQUESTS);

        // when
        concurrently(CONCURRENT_REQUESTS, index -> commentAnchorService.deleteCommentAnchor(
                scenario.post().getId(), commentIds.get(index), scenario.writer().getId()
        ));

        // then
        assertThat(commentCounts(scenario.post().getId())).isEqualTo(new CommentCounts(0, 0));
    }

    @Test
    @DisplayName("같은 댓글을 읽은 여러 요청이 동시에 삭제해도 카운터는 한 번만 감소한다.")
    void concurrentDuplicateDeletesDecrementOnlyOnce() throws Exception {
        // given
        PostScenario scenario = publicPost();
        Long commentId = createComment(scenario).commentAnchorId();
        CountDownLatch commentsLoaded = new CountDownLatch(CONCURRENT_REQUESTS);

        // when
        List<Boolean> deleted = concurrently(CONCURRENT_REQUESTS, index -> {
            try {
                transaction().executeWithoutResult(status -> {
                    commentAnchorRepository.findById(commentId).orElseThrow();
                    commentsLoaded.countDown();
                    await(commentsLoaded);
                    commentAnchorService.deleteCommentAnchor(
                            scenario.post().getId(), commentId, scenario.writer().getId()
                    );
                });
                return true;
            } catch (CommentException failure) {
                assertThat(failure)
                        .isInstanceOf(CommentException.class)
                        .hasMessage(COMMENT_ANCHOR_NOT_FOUND.getMessage());
                return false;
            }
        });

        // then
        assertThat(deleted.stream().filter(Boolean::booleanValue).count()).isEqualTo(1);
        assertThat(commentCounts(scenario.post().getId())).isEqualTo(new CommentCounts(0, 0));
    }

    @Test
    @DisplayName("댓글 추가와 다른 댓글 삭제가 동시에 실행돼도 카운터는 남은 댓글 수와 일치한다.")
    void concurrentAddsAndDeletesPreserveCommentCount() throws Exception {
        // given
        PostScenario scenario = publicPost();
        List<Long> commentIds = comments(scenario, CONCURRENT_REQUESTS);
        Long selectionId = selectionId(commentIds.getFirst());

        // when
        concurrently(CONCURRENT_REQUESTS * 2, index -> {
            if (index < CONCURRENT_REQUESTS) {
                commentAnchorService.addCommentAnchor(
                        scenario.post().getId(), scenario.writer().getId(), selectionId,
                        new CommentAnchorAddCommand(CONTENT)
                );
            } else {
                commentAnchorService.deleteCommentAnchor(
                        scenario.post().getId(), commentIds.get(index - CONCURRENT_REQUESTS),
                        scenario.writer().getId()
                );
            }
            return null;
        });

        // then
        assertThat(commentCounts(scenario.post().getId()))
                .isEqualTo(new CommentCounts(CONCURRENT_REQUESTS, CONCURRENT_REQUESTS));
    }

    @Test
    @DisplayName("다른 요청이 댓글을 추가한 뒤 오래된 게시글을 수정해도 증가한 카운터는 보존된다.")
    void stalePostEditPreservesConcurrentIncrement() throws Exception {
        // given
        PostScenario scenario = publicPost();
        CountDownLatch postLoaded = new CountDownLatch(1);
        CountDownLatch commentCommitted = new CountDownLatch(1);

        // when
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<?> edit = executor.submit(() -> transaction().executeWithoutResult(status -> {
                Post stalePost = postRepository.findById(scenario.post().getId()).orElseThrow();
                postLoaded.countDown();
                await(commentCommitted);
                stalePost.update(PostFixture.updatedPostDetail(), stalePost.getRilog());
            }));
            try {
                await(postLoaded);
                createComment(scenario);
            } finally {
                commentCommitted.countDown();
            }
            edit.get(20, TimeUnit.SECONDS);
        }

        // then
        assertThat(commentCounts(scenario.post().getId())).isEqualTo(new CommentCounts(1, 1));
        assertThat(postRepository.findById(scenario.post().getId()).orElseThrow().getTitle())
                .isEqualTo(PostFixture.updatedPostDetail().title());
    }

    @Test
    @DisplayName("다른 요청이 댓글을 삭제한 뒤 오래된 댓글 내용을 수정해도 삭제 상태와 카운터는 보존된다.")
    void staleCommentEditDoesNotRestoreDeletedComment() throws Exception {
        // given
        PostScenario scenario = publicPost();
        Long commentId = createComment(scenario).commentAnchorId();
        CountDownLatch commentLoaded = new CountDownLatch(1);
        CountDownLatch deletionCommitted = new CountDownLatch(1);

        // when
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<?> edit = executor.submit(() -> transaction().executeWithoutResult(status -> {
                CommentAnchor staleComment = commentAnchorRepository.findById(commentId).orElseThrow();
                commentLoaded.countDown();
                await(deletionCommitted);
                staleComment.updateContent(scenario.writer().getId(), "삭제와 겹친 내용 수정");
            }));
            try {
                await(commentLoaded);
                commentAnchorService.deleteCommentAnchor(
                        scenario.post().getId(), commentId, scenario.writer().getId()
                );
            } finally {
                deletionCommitted.countDown();
            }
            edit.get(20, TimeUnit.SECONDS);
        }

        // then
        assertThat(commentCounts(scenario.post().getId())).isEqualTo(new CommentCounts(0, 0));
        assertThat(commentAnchorRepository.findById(commentId).orElseThrow().isDeleted()).isTrue();
    }

    @Test
    @DisplayName("동시 댓글 작성 중 한 요청이 롤백되면 커밋된 댓글만 카운터에 반영된다.")
    void concurrentRollbackDoesNotLeaveCounterIncrement() throws Exception {
        // given
        PostScenario scenario = publicPost();

        // when
        concurrently(CONCURRENT_REQUESTS, index -> transaction().execute(status -> {
            CommentAnchorCreateResult created = commentAnchorService.createCommentAnchor(
                    scenario.post().getId(), scenario.writer().getId(), selectedCommand(index)
            );
            if (index == 0) {
                status.setRollbackOnly();
            }
            return created;
        }));

        // then
        long expectedCount = CONCURRENT_REQUESTS - 1L;
        assertThat(commentCounts(scenario.post().getId()))
                .isEqualTo(new CommentCounts(expectedCount, expectedCount));
    }

    private PostScenario publicPost() {
        User writer = User.createPendingGithubUser(100L, "counter_writer", "https://example.com/profile.png");
        writer.completeOnboarding(
                "카운터작성자", "counter_writer", "카운터 테스트 소개",
                "https://example.com/profile.png", "https://github.com/counter_writer", "counter@example.com"
        );
        writer = userRepository.saveAndFlush(writer);
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer, "https://rilog.example.com/counter_writer"));
        Post post = postRepository.saveAndFlush(
                PostFixture.publicPublishedRilogPostWithParagraph(rilog, writer, PARAGRAPH_TEXT)
        );
        return new PostScenario(writer, post);
    }

    private CommentAnchorCreateResult createComment(PostScenario scenario) {
        return commentAnchorService.createCommentAnchor(
                scenario.post().getId(), scenario.writer().getId(), selectedCommand(0)
        );
    }

    private List<Long> comments(PostScenario scenario, int count) {
        return IntStream.range(0, count)
                .mapToObj(index -> commentAnchorService.createCommentAnchor(
                        scenario.post().getId(), scenario.writer().getId(), selectedCommand(index)
                ).commentAnchorId())
                .toList();
    }

    private CommentAnchorCreateCommand selectedCommand(int position) {
        return new CommentAnchorCreateCommand(
                PARAGRAPH_BLOCK_ID, position, position + 1,
                PARAGRAPH_TEXT.substring(position, position + 1), CONTENT
        );
    }

    private Long selectionId(Long commentId) {
        return jdbcTemplate.queryForObject(
                "SELECT comment_anchor_selection_id FROM comment_anchor WHERE id = ?", Long.class, commentId
        );
    }

    private CommentCounts commentCounts(Long postId) {
        Long stored = jdbcTemplate.queryForObject(
                "SELECT comment_count FROM post WHERE id = ?", Long.class, postId
        );
        Long active = jdbcTemplate.queryForObject("""
                SELECT COUNT(a.id)
                FROM comment_anchor a
                JOIN comment_anchor_selection s ON s.id = a.comment_anchor_selection_id
                WHERE s.post_id = ? AND a.deleted_at IS NULL
                """, Long.class, postId);
        return new CommentCounts(stored, active);
    }

    private TransactionTemplate transaction() {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setTimeout(20);
        return transaction;
    }

    private <T> List<T> concurrently(int calls, IntFunction<T> operation) throws Exception {
        CountDownLatch ready = new CountDownLatch(calls);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<T>> futures = new ArrayList<>();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            try {
                for (int index = 0; index < calls; index++) {
                    int request = index;
                    futures.add(executor.submit(() -> {
                        ready.countDown();
                        await(start);
                        return operation.apply(request);
                    }));
                }
                await(ready);
                start.countDown();
                List<T> results = new ArrayList<>();
                for (Future<T> future : futures) {
                    results.add(future.get(20, TimeUnit.SECONDS));
                }
                return results;
            } finally {
                start.countDown();
                futures.forEach(future -> future.cancel(true));
            }
        }
    }

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(10, TimeUnit.SECONDS)) {
                throw new AssertionError("동시성 테스트 대기 시간이 초과되었습니다.");
            }
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new AssertionError(failure);
        }
    }

    private record PostScenario(User writer, Post post) {
    }

    private record CommentCounts(long stored, long active) {
    }
}
