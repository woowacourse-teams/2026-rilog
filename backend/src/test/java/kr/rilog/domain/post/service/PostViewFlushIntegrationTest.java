package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.view.PostViewCounterRegistry;
import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.post.view.ViewFlushBatch;
import kr.rilog.domain.post.view.ViewResult;
import kr.rilog.domain.post.view.ViewerIdentity;
import kr.rilog.domain.post.scheduler.PostViewFlushScheduler;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

@Import(PostViewFlushIntegrationTest.StoreObservationConfiguration.class)
class PostViewFlushIntegrationTest extends ServiceSupport {

    @Autowired
    private PostViewFlushService flushService;
    @Autowired
    private ObservedPostViewStore store;
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

    private Scenario scenario;

    @BeforeEach
    void prepareScenario() {
        store.beforeCompletion = () -> { };
        User author = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("집계작성자", "flush_author"));
        Blog blog = blogRepository.saveAndFlush(Blog.createRilog(author));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, author));
        scenario = new Scenario(author, blog);
    }

    @Test
    @DisplayName("메모리 증가분을 DB에 반영하면 저장 중 배치를 비우고 현재 조회수를 유지한다.")
    void persistsPendingViewsAndAcknowledgesBatch() {
        // given
        long postId = publishWithView();

        // when
        new PostViewFlushScheduler(flushService).flush();

        // then
        assertThat(storedCount(postId)).isEqualTo(1L);
        assertThat(store.currentCount(postId)).isEqualTo(1L);
        assertThat(store.prepareFlushBatches()).isEmpty();
    }

    @Test
    @DisplayName("DB 저장이 실패하면 같은 배치를 유지하고 다음 실행에서 재시도한다.")
    void retriesFailedBatchOnNextRun() {
        // given
        long postId = publishWithView();
        ViewFlushBatch failedBatch = store.prepareFlushBatches().getFirst();
        jdbc.update("delete from post_view_count where post_id = ?", postId);
        flushService.flushPendingViews();
        assertThat(store.prepareFlushBatches()).containsExactly(failedBatch);
        jdbc.update("insert into post_view_count (post_id, view_count) values (?, 0)", postId);

        // when
        flushService.flushPendingViews();

        // then
        assertThat(storedCount(postId)).isEqualTo(1L);
        assertThat(store.prepareFlushBatches()).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from post_view_flush_batch where batch_id = ?",
                Long.class, failedBatch.batchId().toString())).isEqualTo(1L);
    }

    @Test
    @DisplayName("한 게시글의 배치 저장이 실패해도 나머지 게시글의 증가분을 저장한다.")
    void continuesAfterOnePostFails() {
        // given
        long failedPostId = publishWithView();
        long successfulPostId = publishWithView();
        jdbc.update("delete from post_view_count where post_id = ?", failedPostId);

        // when
        flushService.flushPendingViews();

        // then
        assertThat(storedCount(successfulPostId)).isEqualTo(1L);
        assertThat(store.prepareFlushBatches()).hasSize(1)
                .allSatisfy(batch -> assertThat(batch.postId()).isEqualTo(failedPostId));
    }

    @Test
    @DisplayName("DB 커밋 후 메모리 완료 처리가 실패해도 다음 실행에서 증가분을 중복 반영하지 않는다.")
    void retriesAfterAcknowledgmentFailureWithoutDoubleCounting() {
        // given
        long postId = publishWithView();
        store.beforeCompletion = () -> { throw new RilogInfrastructureException(INTERNAL_SERVER_ERROR); };
        flushService.flushPendingViews();
        store.beforeCompletion = () -> { };

        // when
        flushService.flushPendingViews();

        // then
        assertSoftly(softly -> {
            softly.assertThat(storedCount(postId)).isEqualTo(1L);
            softly.assertThat(store.currentCount(postId)).isEqualTo(1L);
            softly.assertThat(store.prepareFlushBatches()).isEmpty();
            softly.assertThat(jdbc.queryForObject("select count(*) from post_view_flush_batch", Long.class)).isEqualTo(1L);
        });
    }

    @Test
    @DisplayName("DB 트랜잭션이 커밋된 뒤에만 메모리 배치를 완료한다.")
    void acknowledgesOnlyAfterDatabaseCommit() {
        // given
        long postId = publishWithView();
        store.beforeCompletion = () -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            assertThat(storedCount(postId)).isEqualTo(1L);
            assertThat(jdbc.queryForObject("select count(*) from post_view_flush_batch", Long.class)).isEqualTo(1L);
        };

        // when
        flushService.flushPendingViews();

        // then
        assertThat(store.prepareFlushBatches()).isEmpty();
    }

    @Test
    @DisplayName("배치 저장 중 들어온 새 조회는 다음 배치의 증가분으로 유지한다.")
    void preservesViewsAcceptedDuringFlush() {
        // given
        long postId = publishWithView();
        store.beforeCompletion = () -> store.recordView(postId, ViewerIdentity.member(999L));

        // when
        flushService.flushPendingViews();

        // then
        assertThat(storedCount(postId)).isEqualTo(1L);
        assertThat(store.currentCount(postId)).isEqualTo(2L);
        assertThat(store.prepareFlushBatches()).hasSize(1)
                .allSatisfy(batch -> assertThat(batch.delta()).isEqualTo(1L));
    }

    private long publishWithView() {
        long postId = postService.publish(PostFixture.publicPostPublishCommand(scenario.blog().getSlug()),
                scenario.author().getId()).postId();
        store.recordView(postId, ViewerIdentity.anonymous(UUID.randomUUID()));
        return postId;
    }

    private long storedCount(long postId) {
        return jdbc.queryForObject("select view_count from post_view_count where post_id = ?", Long.class, postId);
    }

    private record Scenario(User author, Blog blog) { }

    @TestConfiguration(proxyBeanMethods = false)
    static class StoreObservationConfiguration {

        @Bean
        @Primary
        ObservedPostViewStore observedPostViewStore(PostViewCounterRegistry registry) {
            return new ObservedPostViewStore(registry);
        }
    }

    static class ObservedPostViewStore implements PostViewStore {

        private final PostViewCounterRegistry registry;
        private Runnable beforeCompletion = () -> { };

        ObservedPostViewStore(PostViewCounterRegistry registry) {
            this.registry = registry;
        }

        @Override
        public ViewResult recordView(long postId, ViewerIdentity viewer) {
            return registry.recordView(postId, viewer);
        }

        @Override
        public long currentCount(long postId) {
            return registry.currentCount(postId);
        }

        @Override
        public List<ViewFlushBatch> prepareFlushBatches() {
            // 실패 게시글을 먼저 처리하도록 순서만 고정하고 실제 메모리 저장소를 사용한다.
            return registry.prepareFlushBatches().stream().sorted(Comparator.comparingLong(ViewFlushBatch::postId)).toList();
        }

        @Override
        public void completeFlush(long postId, UUID batchId) {
            beforeCompletion.run();
            registry.completeFlush(postId, batchId);
        }
    }
}
