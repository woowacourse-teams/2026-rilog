package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.view.ViewFlushBatch;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_INVALID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostViewFlushWriterIntegrationTest extends ServiceSupport {

    @Autowired
    private PostViewFlushWriter writer;
    @Autowired
    private PostService postService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private BlogRepository blogRepository;
    @Autowired
    private BlogMemberRepository blogMemberRepository;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("배치를 저장하면 기존 조회수에 증가분을 더하고 반영 이력을 함께 커밋한다.")
    void commitsDeltaAndBatchTogether() {
        // given
        long postId = publish();
        jdbc.update("update post_view_count set view_count = 42 where post_id = ?", postId);
        ViewFlushBatch batch = batch(postId, 3L);

        // when
        writer.write(batch);

        // then
        assertThat(storedCount(postId)).isEqualTo(45L);
        assertThat(appliedBatchCount(batch)).isEqualTo(1L);
    }

    @Test
    @DisplayName("이미 커밋한 배치를 재전달해도 증가분을 한 번만 반영한다.")
    void doesNotApplyCommittedBatchTwice() {
        // given
        long postId = publish();
        ViewFlushBatch batch = batch(postId, 3L);
        writer.write(batch);

        // when
        writer.write(batch);

        // then
        assertThat(storedCount(postId)).isEqualTo(3L);
        assertThat(appliedBatchCount(batch)).isEqualTo(1L);
    }

    @Test
    @DisplayName("조회수 범위를 초과하면 배치 이력과 누계 변경을 함께 롤백한다.")
    void rollsBackBatchWhenCountCannotIncrease() {
        // given
        long postId = publish();
        jdbc.update("update post_view_count set view_count = 9007199254740991 where post_id = ?", postId);
        ViewFlushBatch batch = batch(postId, 1L);

        // when & then
        assertThatThrownBy(() -> writer.write(batch))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(POST_VIEW_COUNT_INVALID.getMessage());
        assertThat(storedCount(postId)).isEqualTo(9_007_199_254_740_991L);
        assertThat(appliedBatchCount(batch)).isZero();
    }

    @Test
    @DisplayName("같은 배치 ID에 다른 증가분이 전달되면 정상 재시도로 인정하지 않는다.")
    void rejectsConflictingBatchPayload() {
        // given
        long postId = publish();
        ViewFlushBatch batch = batch(postId, 3L);
        writer.write(batch);
        ViewFlushBatch conflicting = new ViewFlushBatch(batch.batchId(), postId, 5L, batch.createdAt());

        // when & then
        assertThatThrownBy(() -> writer.write(conflicting))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(POST_VIEW_COUNT_INVALID.getMessage());
        assertThat(storedCount(postId)).isEqualTo(3L);
        assertThat(appliedBatchCount(batch)).isEqualTo(1L);
    }

    @Test
    @DisplayName("같은 배치를 동시에 저장하고 재시도해도 증가분을 한 번만 반영한다.")
    void concurrentDeliveryAppliesDeltaOnce() throws Exception {
        // given
        long postId = publish();
        ViewFlushBatch batch = batch(postId, 3L);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        // when
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> {
                writeConcurrently(batch, ready, start);
                return null;
            });
            var second = executor.submit(() -> {
                writeConcurrently(batch, ready, start);
                return null;
            });
            try {
                assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            } finally {
                start.countDown();
            }
            first.get(10, TimeUnit.SECONDS);
            second.get(10, TimeUnit.SECONDS);
        }
        writer.write(batch);

        // then
        assertThat(storedCount(postId)).isEqualTo(3L);
        assertThat(appliedBatchCount(batch)).isEqualTo(1L);
    }

    private void writeConcurrently(ViewFlushBatch batch, CountDownLatch ready, CountDownLatch start)
            throws InterruptedException {
        ready.countDown();
        if (!start.await(5, TimeUnit.SECONDS)) {
            throw new IllegalStateException("동시 배치 저장 시작을 기다리지 못했습니다.");
        }
        try {
            writer.write(batch);
        } catch (DataIntegrityViolationException duplicateDelivery) {
            // 동시에 처음 도착한 배치의 PK 충돌은 다음 정기 실행에서 같은 ID로 재시도한다.
        }
    }

    private long publish() {
        User author = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("배치작성자", "flush_writer"));
        Blog blog = blogRepository.saveAndFlush(Blog.createRilog(author));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, author));
        return postService.publish(PostFixture.publicPostPublishCommand(blog.getSlug()), author.getId()).postId();
    }

    private ViewFlushBatch batch(long postId, long delta) {
        return new ViewFlushBatch(UUID.randomUUID(), postId, delta, Instant.parse("2026-10-18T00:00:00.123456789Z"));
    }

    private long storedCount(long postId) {
        return jdbc.queryForObject("select view_count from post_view_count where post_id = ?", Long.class, postId);
    }

    private long appliedBatchCount(ViewFlushBatch batch) {
        return jdbc.queryForObject("select count(*) from post_view_flush_batch where batch_id = ?", Long.class,
                batch.batchId().toString());
    }
}
