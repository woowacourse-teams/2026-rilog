package kr.rilog.domain.post.trending;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.repository.TrendingPostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TrendingRefreshIntegrationTest extends ServiceSupport {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 21, 12, 0);

    @Autowired private TrendingCandidateRepository candidates;
    @Autowired private TrendingRefreshService refreshService;
    @Autowired private TrendingPostRepository trendingPosts;
    @Autowired private UserRepository users;
    @Autowired private BlogRepository blogs;
    @Autowired private PostFeedQueryRepository posts;
    @Autowired private JdbcTemplate jdbc;

    @Test
    @DisplayName("갱신은 모든 후보의 점수를 저장하며 후보가 줄거나 없어지면 이전 결과를 제거한다")
    void refreshesAllCandidatesAndReplacesSmallerOrEmptySnapshots() {
        User author = user(1);
        Blog rilog = blogs.saveAndFlush(Blog.createRilog(author));
        List<Long> equalScoreIds = new ArrayList<>();
        for (int i = 0; i < 38; i++) {
            equalScoreIds.add(post(rilog, author, NOW).getId());
        }
        Post newer = post(rilog, author, NOW.minusHours(1));
        Post older = post(rilog, author, NOW.minusDays(7));
        jdbc.update("insert into post_view_count (post_id, view_count) values (?, ?)", newer.getId(), 100L);
        jdbc.update("insert into post_view_count (post_id, view_count) values (?, ?)", older.getId(), 100L);

        assertThat(refreshService.refresh(NOW)).isEqualTo(40);
        List<Long> expected = new ArrayList<>(List.of(newer.getId(), older.getId()));
        equalScoreIds.sort(Comparator.reverseOrder());
        expected.addAll(equalScoreIds);
        assertThat(rankedIds()).containsExactlyElementsOf(expected);
        assertThat(jdbc.queryForObject("select min(calculated_at) from trending_post", LocalDateTime.class))
                .isEqualTo(NOW);
        assertThat(jdbc.queryForObject("select score from trending_post where post_id = ?", BigDecimal.class, older.getId()))
                .isEqualByComparingTo("50");

        TrendingRefreshService differentPolicy = new TrendingRefreshService(candidates,
                (candidate, at) -> candidate.postId().equals(older.getId()) ? BigDecimal.TEN : BigDecimal.ZERO,
                trendingPosts);
        differentPolicy.refresh(NOW);
        assertThat(rankedIds()).hasSize(40).first().isEqualTo(older.getId());

        jdbc.update("update post set visibility = 'PRIVATE' where id <> ?", newer.getId());
        assertThat(refreshService.refresh(NOW)).isEqualTo(1);
        assertThat(rankedIds()).containsExactly(newer.getId());
        jdbc.update("update post set visibility = 'PRIVATE'");
        assertThat(refreshService.refresh(NOW)).isZero();
        assertThat(rankedIds()).isEmpty();
    }

    @Test
    @DisplayName("교체 도중 저장이 실패하면 삭제와 앞선 삽입도 롤백하여 이전 순위를 보존한다")
    void failedReplacementPreservesPreviousSnapshot() {
        User author = user(1);
        Blog rilog = blogs.saveAndFlush(Blog.createRilog(author));
        Post previous = post(rilog, author, NOW);
        Post replacement = post(rilog, author, NOW);
        trendingPosts.replaceAll(List.of(new TrendingScore(previous.getId(), BigDecimal.TEN)), NOW);

        assertThatThrownBy(() -> trendingPosts.replaceAll(List.of(
                new TrendingScore(replacement.getId(), BigDecimal.ONE),
                new TrendingScore(Long.MAX_VALUE, BigDecimal.ONE)
        ), NOW.plusHours(3))).isInstanceOf(DataIntegrityViolationException.class);

        assertThat(rankedIds()).containsExactly(previous.getId());
        assertThat(jdbc.queryForObject("select calculated_at from trending_post", LocalDateTime.class)).isEqualTo(NOW);
    }

    private User user(long id) {
        User user = UserFixture.user(id, "trending_user_" + id);
        user.completeOnboarding("작성자" + id, "trending_user_" + id, "소개", "https://example.com/profile.png",
                "https://github.com/user" + id, "user" + id + "@example.com");
        return users.saveAndFlush(user);
    }

    private Post post(Blog rilog, User author, LocalDateTime at) {
        return posts.saveAndFlush(PostFixture.publicPublishedRilogPostAt(rilog, author, at));
    }

    private List<Long> rankedIds() {
        return jdbc.queryForList("""
                select t.post_id from trending_post t join post p on p.id = t.post_id
                order by t.score desc, p.published_at desc, p.id desc
                """, Long.class);
    }
}
