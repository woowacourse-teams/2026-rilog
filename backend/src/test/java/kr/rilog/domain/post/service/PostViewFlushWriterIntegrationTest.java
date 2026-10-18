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

import java.time.Instant;
import java.util.UUID;

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
    @DisplayName("배치를 저장하면 기존 조회수에 증가분을 더하고 별도 배치 이력은 쌓지 않는다.")
    void commitsDeltaWithoutBatchHistory() {
        // given
        long postId = publish();
        jdbc.update("update post_view_count set view_count = 42 where post_id = ?", postId);
        ViewFlushBatch batch = batch(postId, 3L);

        // when
        writer.write(batch);

        // then
        assertThat(storedCount(postId)).isEqualTo(45L);
        assertThat(appliedBatchCount(batch)).isZero();
    }

    @Test
    @DisplayName("조회수 범위를 초과하면 기존 누계를 변경하지 않는다.")
    void preservesCountWhenItCannotIncrease() {
        // given
        long postId = publish();
        jdbc.update("update post_view_count set view_count = 9007199254740991 where post_id = ?", postId);
        ViewFlushBatch batch = batch(postId, 1L);

        // when & then
        assertThatThrownBy(() -> writer.write(batch))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(POST_VIEW_COUNT_INVALID.getMessage());
        assertThat(storedCount(postId)).isEqualTo(9_007_199_254_740_991L);
    }

    @Test
    @DisplayName("조회수 누계가 없으면 배치 저장에 실패한다.")
    void rejectsMissingCount() {
        // given
        ViewFlushBatch batch = batch(999_999L, 1L);

        // when & then
        assertThatThrownBy(() -> writer.write(batch))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(POST_VIEW_COUNT_INVALID.getMessage());
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
