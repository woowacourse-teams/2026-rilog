package kr.rilog.domain.post.view;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.service.PostService;
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

import java.util.UUID;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_MISSING;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostViewCounterIntegrationTest extends ServiceSupport {

    @Autowired
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

    @Test
    @DisplayName("DB 누계가 없으면 현재 조회수를 읽을 수 없다.")
    void rejectsReadWhenStoredCountIsMissing() {
        // when & then
        assertThatThrownBy(() -> registry.currentCount(999_999L))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(POST_VIEW_COUNT_MISSING.getMessage());
    }

    @Test
    @DisplayName("DB 누계를 불러오지 못하면 카운터를 등록하지 않는다.")
    void doesNotInstallCounterWhenLoadingFails() {
        // when & then
        assertThatThrownBy(() -> registry.getOrLoad(999_999L))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(POST_VIEW_COUNT_MISSING.getMessage());
        assertThat(registry.snapshot()).isEmpty();
    }

    @Test
    @DisplayName("현재 조회수 읽기는 DB 누계를 반환하고 카운터를 생성하지 않는다.")
    void readsStoredCountWithoutCreatingCounter() {
        // given
        Scenario scenario = scenario();
        long postId = publishWithStoredCount(scenario, 42L);

        // when
        long currentCount = registry.currentCount(postId);

        // then
        assertThat(currentCount).isEqualTo(42L);
        assertThat(registry.snapshot()).isEmpty();
    }

    @Test
    @DisplayName("조회 등록은 DB 누계에서 증가한 값을 반환하고 요청 중 DB에 기록하지 않는다.")
    void initializesFromStoredCountWithoutWritingThroughRequests() {
        // given
        Scenario scenario = scenario();
        long postId = publishWithStoredCount(scenario, 42L);
        ViewerIdentity viewer = ViewerIdentity.anonymous(
                UUID.fromString("72b85b6f-c498-480a-bb68-2d2b09aed93e"));

        // when
        ViewResult result = registry.recordView(postId, viewer);

        // then
        assertThat(result).isEqualTo(new ViewResult(true, 43L));
        assertThat(jdbc.queryForObject(
                "select view_count from post_view_count where post_id = ?", Long.class, postId))
                .isEqualTo(42L);
        assertThat(jdbc.queryForObject("select count(*) from post_view_flush_batch", Long.class)).isZero();
    }

    @Test
    @DisplayName("카운터 스냅샷은 초기화를 완료한 게시글의 카운터를 모두 반환한다.")
    void snapshotContainsAllInitializedCounters() {
        // given
        Scenario scenario = scenario();
        long firstPostId = publishWithStoredCount(scenario, 42L);
        long secondPostId = publishWithStoredCount(scenario, 0L);
        PostViewCounter firstCounter = registry.getOrLoad(firstPostId);
        PostViewCounter secondCounter = registry.getOrLoad(secondPostId);

        // when
        var counters = registry.snapshot();

        // then
        assertThat(counters).containsExactlyInAnyOrder(firstCounter, secondCounter);
    }

    private Scenario scenario() {
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("메모리작성자", "memory_writer"));
        Blog blog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, writer));
        return new Scenario(writer, blog);
    }

    private long publishWithStoredCount(Scenario scenario, long storedCount) {
        long postId = postService.publish(PostFixture.publicPostPublishCommand(scenario.blog().getSlug()),
                scenario.writer().getId()).postId();
        jdbc.update("update post_view_count set view_count = ? where post_id = ?", storedCount, postId);
        return postId;
    }

    private record Scenario(User writer, Blog blog) { }
}
