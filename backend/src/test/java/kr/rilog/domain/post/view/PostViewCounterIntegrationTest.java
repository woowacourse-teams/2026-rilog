package kr.rilog.domain.post.view;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.service.PostService;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_CAPACITY_EXCEEDED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
        "post.views.max-viewer-records=2"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PostViewCounterIntegrationTest extends ServiceSupport {

    @DynamicPropertySource
    static void isolateH2Database(DynamicPropertyRegistry properties) {
        if ("test".equals(System.getProperty("spring.profiles.active", "test"))) {
            // 컨텍스트 종료의 create-drop이 다른 테스트의 공유 H2 스키마를 삭제하지 않게 한다.
            properties.add("spring.datasource.url",
                    () -> "jdbc:h2:mem:rilog_post_view_counter;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        }
    }

    @Autowired(required = false)
    private PostViewCounterRegistry registry;
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
    @Autowired(required = false)
    private ScheduledAnnotationBeanPostProcessor scheduling;

    @Test
    @DisplayName("Spring 카운터는 실제 DB 누계로 초기화하고 설정된 한도를 지키며 DB 쓰기 없이 집계한다")
    void initializesFromDatabaseAndCountsWithinConfiguredLimits() {
        assertThat(registry).isNotNull();
        assertThatThrownBy(() -> registry.currentCount(999_999)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> registry.getOrLoad(999_999)).isInstanceOf(IllegalStateException.class);
        assertThat(registry.snapshot()).isEmpty();

        var writer = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("메모리작성자", "memory_writer"));
        var blog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, writer));
        long postId = postService.publish(PostFixture.publicPostPublishCommand(blog.getSlug()), writer.getId()).postId();
        jdbc.update("update post_view_count set view_count = 42 where post_id = ?", postId);

        assertThat(registry.currentCount(postId)).isEqualTo(42);
        assertThat(registry.snapshot()).isEmpty();
        var counter = registry.getOrLoad(postId);
        assertThat(registry.recordView(postId, ViewerIdentity.member(1))).isEqualTo(new ViewResult(true, 43));
        assertThat(registry.recordView(postId, ViewerIdentity.member(2))).isEqualTo(new ViewResult(true, 44));
        assertThat(registry.recordView(postId, ViewerIdentity.member(1))).isEqualTo(new ViewResult(false, 44));
        assertThat(registry.currentCount(postId)).isEqualTo(44);
        assertThatThrownBy(() -> registry.recordView(postId, ViewerIdentity.member(3)))
                .isInstanceOfSatisfying(PostException.class,
                        failure -> assertThat(failure.getErrorInformation()).isEqualTo(POST_VIEW_CAPACITY_EXCEEDED));
        long secondPostId = postService.publish(PostFixture.publicPostPublishCommand(blog.getSlug()), writer.getId()).postId();
        var emptyCounter = registry.getOrLoad(secondPostId);
        assertThat(emptyCounter.currentCount()).isZero();
        assertThat(registry.snapshot()).containsExactlyInAnyOrder(counter, emptyCounter);

        assertThat(jdbc.queryForObject("select view_count from post_view_count where post_id = ?", Long.class, postId))
                .isEqualTo(42);
        assertThat(jdbc.queryForObject("select count(*) from post_view_flush_batch", Long.class)).isZero();

        assertThat(scheduling).isNotNull();
        var cleanupTasks = scheduling.getScheduledTasks().stream()
                .filter(task -> task.getTask().toString().equals(
                        PostViewCleanupScheduler.class.getName() + ".removeExpiredViewerRecords"))
                .map(task -> task.getTask().getRunnable())
                .toList();
        assertThat(cleanupTasks).hasSize(1);
        cleanupTasks.getFirst().run();
        assertThat(registry.snapshot()).containsExactlyInAnyOrder(counter, emptyCounter);
        assertThat(registry.currentCount(secondPostId)).isZero();
        assertThat(registry.currentCount(postId)).isEqualTo(44);
    }
}
