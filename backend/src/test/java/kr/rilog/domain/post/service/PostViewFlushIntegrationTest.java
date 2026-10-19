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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

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
        store.afterPreparation = () -> { };
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
    @DisplayName("저장 실패 시 증가분을 유지하고 다음 실행에서 같은 배치를 재시도한다.")
    void retriesFailedBatchOnNextRun() {
        // given
        long postId = publishWithView();
        jdbc.update("delete from post_view_count where post_id = ?", postId);
        flushService.flushPendingViews();
        jdbc.update("insert into post_view_count (post_id, view_count) values (?, 0)", postId);

        // when
        flushService.flushPendingViews();

        // then
        assertThat(storedCount(postId)).isEqualTo(1L);
        assertThat(store.currentCount(postId)).isEqualTo(1L);
        assertThat(store.prepareFlushBatches()).isEmpty();
    }

    @Test
    @DisplayName("뒤 게시글 저장이 실패하면 앞 게시글의 UPDATE도 롤백하고 모든 배치를 유지한다.")
    void rollsBackAllPostsAndKeepsAllBatches() {
        // given
        long firstPostId = publishWithView();
        long failedPostId = publishWithView();
        jdbc.update("delete from post_view_count where post_id = ?", failedPostId);

        // when
        flushService.flushPendingViews();

        // then
        assertThat(storedCount(firstPostId)).isZero();
        assertThat(store.currentCount(firstPostId)).isEqualTo(1L);
        assertThat(store.prepareFlushBatches()).hasSize(2);
    }

    @Test
    @DisplayName("커밋 후 메모리 완료 실패로 같은 배치를 재시도하면 DB 중복 증가를 허용한다.")
    void allowsDuplicateIncrementAfterAcknowledgmentFailure() {
        // given
        long postId = publishWithView();
        store.beforeCompletion = () -> { throw new RilogInfrastructureException(INTERNAL_SERVER_ERROR); };
        flushService.flushPendingViews();
        store.beforeCompletion = () -> { };

        // when
        flushService.flushPendingViews();

        // then
        assertThat(storedCount(postId)).isEqualTo(2L);
        assertThat(store.currentCount(postId)).isEqualTo(1L);
        assertThat(store.prepareFlushBatches()).isEmpty();
    }

    @Test
    @DisplayName("삭제된 글은 배치에서 제외하고 다른 게시글의 조회수는 저장한다.")
    void skipsDeletedPostWithoutBlockingOtherPosts() {
        // given
        long deletedPostId = publishWithView();
        long activePostId = publishWithView();
        postService.deletePublishedPost(deletedPostId, scenario.author().getId());

        // when
        flushService.flushPendingViews();

        // then
        assertSoftly(softly -> {
            softly.assertThat(storedCount(deletedPostId)).isZero();
            softly.assertThat(storedCount(activePostId)).isEqualTo(1L);
            softly.assertThat(store.currentCount(deletedPostId)).isZero();
            softly.assertThat(store.prepareFlushBatches()).isEmpty();
        });
    }

    @Test
    @DisplayName("모든 게시글의 DB 트랜잭션이 커밋된 뒤에만 메모리 배치를 완료한다.")
    void acknowledgesOnlyAfterAllPostsCommit() {
        // given
        long firstPostId = publishWithView();
        long secondPostId = publishWithView();
        store.beforeCompletion = () -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            assertThat(storedCount(firstPostId)).isEqualTo(1L);
            assertThat(storedCount(secondPostId)).isEqualTo(1L);
        };

        // when
        flushService.flushPendingViews();

        // then
        assertThat(store.prepareFlushBatches()).isEmpty();
    }

    @Test
    @DisplayName("실패 후 새로 들어온 조회는 재시도 중인 배치에 합치지 않고 다음 배치에 보존한다.")
    void preservesNewViewsAcrossRetry() {
        // given
        long postId = publishWithView();
        jdbc.update("delete from post_view_count where post_id = ?", postId);
        flushService.flushPendingViews();
        store.recordView(postId, ViewerIdentity.member(999L));
        jdbc.update("insert into post_view_count (post_id, view_count) values (?, 0)", postId);

        // when
        flushService.flushPendingViews();

        // then
        assertThat(storedCount(postId)).isEqualTo(1L);
        assertThat(store.currentCount(postId)).isEqualTo(2L);
        assertThat(store.prepareFlushBatches()).hasSize(1)
                .allSatisfy(batch -> assertThat(batch.delta()).isEqualTo(1L));
    }

    @Test
    @DisplayName("배치를 준비한 뒤 삭제된 글도 DB 저장에서 제외한다.")
    void skipsPostDeletedAfterPreparation() {
        // given
        long postId = publishWithView();
        store.afterPreparation = () -> {
            store.afterPreparation = () -> { };
            postService.deletePublishedPost(postId, scenario.author().getId());
        };

        // when
        flushService.flushPendingViews();

        // then
        assertThat(storedCount(postId)).isZero();
        assertThat(store.currentCount(postId)).isZero();
        assertThat(store.prepareFlushBatches()).isEmpty();
    }

    @Test
    @DisplayName("전체 저장이 롤백되면 삭제된 글의 Counter 제거도 보류한다.")
    void retainsDeletedCounterWhenWholeTransactionRollsBack() {
        // given
        long deletedPostId = publishWithView();
        long activePostId = publishWithView();
        long failedPostId = publishWithView();
        postService.deletePublishedPost(deletedPostId, scenario.author().getId());
        jdbc.update("delete from post_view_count where post_id = ?", failedPostId);

        // when
        flushService.flushPendingViews();

        // then
        assertThat(store.currentCount(deletedPostId)).isEqualTo(1L);
        assertThat(storedCount(activePostId)).isZero();
        assertThat(store.prepareFlushBatches()).hasSize(3);
    }

    @Test
    @DisplayName("배치 실행이 겹치면 후속 실행은 건너뛰고 새 조회는 계속 받을 수 있다.")
    void skipsOverlappingFlushWhileAcceptingNewViews() throws Exception {
        // given
        long postId = publishWithView();
        CountDownLatch prepared = new CountDownLatch(1);
        CompletableFuture<Void> release = new CompletableFuture<>();
        AtomicBoolean firstPreparation = new AtomicBoolean(true);
        store.afterPreparation = () -> {
            if (firstPreparation.compareAndSet(true, false)) {
                prepared.countDown();
                release.join();
            }
        };

        // when
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(flushService::flushPendingViews);
            try {
                assertThat(prepared.await(5, TimeUnit.SECONDS)).isTrue();
                store.recordView(postId, ViewerIdentity.member(999L));
                executor.submit(flushService::flushPendingViews).get(2, TimeUnit.SECONDS);
            } finally {
                release.complete(null);
            }
            first.get(10, TimeUnit.SECONDS);
        }

        // then
        assertThat(storedCount(postId)).isEqualTo(1L);
        assertThat(store.currentCount(postId)).isEqualTo(2L);
        assertThat(store.prepareFlushBatches()).hasSize(1)
                .allSatisfy(batch -> assertThat(batch.delta()).isEqualTo(1L));
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
        private Runnable afterPreparation = () -> { };

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
            List<ViewFlushBatch> batches = registry.prepareFlushBatches().stream()
                    .sorted(Comparator.comparingLong(ViewFlushBatch::postId)).toList();
            afterPreparation.run();
            return batches;
        }

        @Override
        public void removeCounter(long postId) {
            registry.removeCounter(postId);
        }

        @Override
        public void completeFlush(long postId, UUID batchId) {
            beforeCompletion.run();
            registry.completeFlush(postId, batchId);
        }
    }
}
