package kr.rilog.domain.post.trending;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.entity.Comment;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.comment.repository.CommentRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.repository.TrendingPostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.CommentAnchorFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

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
    @Autowired private BlogMemberRepository members;
    @Autowired private PostFeedQueryRepository posts;
    @Autowired private CommentRepository comments;
    @Autowired private CommentAnchorRepository anchors;
    @Autowired private CommentAnchorSelectionRepository selections;
    @Autowired private JdbcTemplate jdbc;

    @Test
    @DisplayName("인라인 댓글만 집계하며 작성자와 발행 블로그의 현재 멤버는 제외한다")
    void countsOnlyExternalInlineCommentsOfPublishingBlog() {
        User author = user(1);
        User member = user(2);
        User formerMember = user(3);
        User outsider = user(4);
        User deletedMember = user(5);
        Blog rilog = blogs.saveAndFlush(Blog.createRilog(author));
        Blog colog = blogs.saveAndFlush(Blog.createColog(author, "ranking_colog", BlogFixture.cologProfile()));
        Blog unrelated = blogs.saveAndFlush(Blog.createColog(outsider, "other_colog", BlogFixture.cologProfile()));
        members.saveAndFlush(BlogMemberFixture.blogMember(colog, member));
        members.saveAndFlush(BlogMemberFixture.leftMember(colog, formerMember));
        members.saveAndFlush(BlogMemberFixture.owner(unrelated, outsider));
        BlogMember deletedMembership = BlogMemberFixture.blogMember(colog, deletedMember);
        deletedMembership.delete();
        members.saveAndFlush(deletedMembership);
        Post cologPost = PostFixture.publicPublishedColog(rilog, colog, author);
        ReflectionTestUtils.setField(cologPost, "publishedAt", NOW.minusDays(1));
        cologPost = posts.saveAndFlush(cologPost);
        Post personalPost = post(rilog, author, NOW.minusDays(1));
        jdbc.update("insert into post_view_count (post_id, view_count) values (?, ?)", cologPost.getId(), 123L);

        // 하단 댓글·답글 데이터가 있어도 트렌딩 점수에는 반영하지 않는다.
        Comment root = comments.saveAndFlush(Comment.createRoot(cologPost, outsider, "하단 댓글"));
        comments.saveAndFlush(Comment.createReply(root, outsider, "외부 답글"));
        anchor(cologPost, outsider, false, false);
        anchor(cologPost, formerMember, false, false);
        anchor(cologPost, deletedMember, false, false);
        anchor(cologPost, member, false, false);
        anchor(cologPost, author, false, false);
        anchor(cologPost, outsider, true, false);
        anchor(cologPost, outsider, false, true);
        anchor(personalPost, member, false, false); // 같은 코로그 멤버여도 개인 리로그에서는 외부인
        anchor(personalPost, author, false, false);

        List<TrendingCandidate> result = candidates.findCandidates(NOW.minusMonths(2), NOW);

        assertThat(result).containsExactlyInAnyOrder(
                new TrendingCandidate(cologPost.getId(), NOW.minusDays(1), 123L, 3L),
                new TrendingCandidate(personalPost.getId(), NOW.minusDays(1), 0L, 1L)
        );
        Long cologPostId = cologPost.getId();
        members.saveAndFlush(BlogMemberFixture.blogMember(colog, outsider));
        assertThat(candidates.findCandidates(NOW.minusMonths(2), NOW))
                .filteredOn(candidate -> candidate.postId().equals(cologPostId))
                .extracting(TrendingCandidate::externalCommentCount)
                .containsExactly(2L);
    }

    @Test
    @DisplayName("배치는 두 달 경계를 포함하고 미래·만료·비공개·초안·삭제·더 리로그 글을 제외한다")
    void refreshesOnlyEligiblePostsWithinTwoCalendarMonths() {
        User author = user(1);
        Blog rilog = blogs.saveAndFlush(Blog.createRilog(author));
        Post boundary = post(rilog, author, NOW.minusMonths(2));
        Post newest = post(rilog, author, NOW);
        post(rilog, author, NOW.minusMonths(2).minusNanos(1_000));
        post(rilog, author, NOW.plusSeconds(1));
        Post privatePost = post(rilog, author, NOW.minusDays(1));
        Post draft = post(rilog, author, NOW.minusDays(1));
        Post deleted = post(rilog, author, NOW.minusDays(1));
        Post editorial = post(rilog, author, NOW.minusDays(1));
        jdbc.update("update post set visibility = 'PRIVATE' where id = ?", privatePost.getId());
        jdbc.update("update post set status = 'DRAFT' where id = ?", draft.getId());
        jdbc.update("update post set deleted_at = ? where id = ?", NOW, deleted.getId());
        jdbc.update("update post set post_type = 'DAILY_HEADLINES' where id = ?", editorial.getId());

        assertThat(refreshService.refresh(NOW)).isEqualTo(2);
        assertThat(rankedIds()).containsExactlyInAnyOrder(boundary.getId(), newest.getId());
    }

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

    private void anchor(Post post, User writer, boolean deleted, boolean deletedSelection) {
        CommentAnchor anchor = CommentAnchorFixture.orphanedAnchor(post, writer);
        if (deleted) anchor.delete();
        if (deletedSelection) anchor.getCommentAnchorSelection().delete();
        selections.saveAndFlush(anchor.getCommentAnchorSelection());
        anchors.saveAndFlush(anchor);
    }

    private List<Long> rankedIds() {
        return jdbc.queryForList("""
                select t.post_id from trending_post t join post p on p.id = t.post_id
                order by t.score desc, p.published_at desc, p.id desc
                """, Long.class);
    }
}
