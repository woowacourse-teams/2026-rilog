package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.service.dto.command.FullFeedSearchCommand;
import kr.rilog.domain.post.service.dto.result.FullFeedPostResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.CommentAnchorFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.TheRilogPostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;

class TrendingServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime BASE_PUBLISHED_AT = LocalDateTime.now().minusDays(1).withNano(0);
    private static final FullFeedSearchCommand DEFAULT_SEARCH = new FullFeedSearchCommand(
            null,
            null,
            0,
            10
    );

    @Autowired
    private TrendingService trendingService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private PostFeedQueryRepository postFeedQueryRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CommentAnchorRepository commentAnchorRepository;

    @Autowired
    private CommentAnchorSelectionRepository commentAnchorSelectionRepository;

    @Test
    @DisplayName("트렌딩 피드는 삭제되지 않은 인라인 댓글 카운터와 댓글이 없는 게시글의 0을 반환한다.")
    void readTrendingPostsReturnsInlineCommentCounts() {
        // given
        User author = saveCompletedUser(6L, "트렌딩댓글작성자", "trend_comments");
        Blog rilog = saveRilog(author);
        Post postWithComments = savePost(PostFixture.publicPublishedRilogPostAt(
                rilog, author, BASE_PUBLISHED_AT.plusMinutes(1)
        ));
        Post postWithoutComments = savePost(PostFixture.publicPublishedRilogPostAt(
                rilog, author, BASE_PUBLISHED_AT
        ));
        saveTrending(10L, postWithComments);
        saveTrending(20L, postWithoutComments);
        saveAnchor(CommentAnchorFixture.activeAnchor(postWithComments, author));
        saveAnchor(CommentAnchorFixture.orphanedAnchor(postWithComments, author));
        CommentAnchor deletedAnchor = CommentAnchorFixture.activeAnchor(postWithComments, author);
        deletedAnchor.delete();
        saveAnchor(deletedAnchor);

        // when
        FullFeedPostResult result = trendingService.readTrendingPostList(DEFAULT_SEARCH);

        // then
        Map<Long, Long> commentCounts = result.posts().stream()
                .collect(Collectors.toMap(
                        FullFeedPostResult.PostItemResult::postId,
                        FullFeedPostResult.PostItemResult::totalCommentsCount
                ));
        assertThat(commentCounts)
                .containsEntry(postWithComments.getId(), 2L)
                .containsEntry(postWithoutComments.getId(), 0L);
    }

    @Test
    @DisplayName("트렌딩 피드는 점수 내림차순으로, 동점이면 트렌딩 ID 내림차순으로 반환한다.")
    void readTrendingPostsOrdersByScoreAndTrendingId() {
        // given
        User author = saveCompletedUser(1L, "트렌딩작성자", "trending_author");
        Blog rilog = saveRilog(author);
        Post olderPost = savePost(PostFixture.publicPublishedRilogPostAt(
                rilog,
                author,
                BASE_PUBLISHED_AT
        ));
        Post newerPost = savePost(PostFixture.publicPublishedRilogPostAt(
                rilog,
                author,
                BASE_PUBLISHED_AT.plusMinutes(1)
        ));
        saveTrending(20L, olderPost);
        saveTrending(10L, newerPost);
        jdbcTemplate.update("update trending_post set score = 100");
        Post highestScorePost = savePost(PostFixture.publicPublishedRilogPostAt(rilog, author, BASE_PUBLISHED_AT.minusDays(1)));
        saveTrending(5L, highestScorePost);

        // when
        FullFeedPostResult result = trendingService.readTrendingPostList(DEFAULT_SEARCH);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResult.PostItemResult::postId)
                .containsExactly(highestScorePost.getId(), olderPost.getId(), newerPost.getId());
    }

    @Test
    @DisplayName("트렌딩 피드는 다음 배치 전에도 만료·미래·비공개·초안·삭제 게시글은 반환하지 않는다.")
    void readTrendingPostsReturnsOnlyReadablePublishedPosts() {
        // given
        User author = saveCompletedUser(2L, "상태필터작성자", "trend_status");
        Blog rilog = saveRilog(author);
        Post publicPost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        Post privatePost = savePost(PostFixture.privatePublishedRilogPost(rilog, author));
        Post draftPost = savePost(PostFixture.publicDraftRilogPost(rilog, author));
        Post deletedPost = savePost(PostFixture.deletedPublicPublishedRilogPost(rilog, author));
        Post expiredPost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        Post futurePost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        Post olderEligiblePost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        jdbcTemplate.update("update post set published_at = ? where id = ?", BASE_PUBLISHED_AT.minusMonths(1).minusDays(10), olderEligiblePost.getId());
        saveTrending(15L, olderEligiblePost);
        jdbcTemplate.update("update post set published_at = ? where id = ?", BASE_PUBLISHED_AT.minusMonths(2), expiredPost.getId());
        jdbcTemplate.update("update post set published_at = ? where id = ?", BASE_PUBLISHED_AT.plusMonths(2), futurePost.getId());
        saveTrending(50L, expiredPost);
        saveTrending(60L, futurePost);
        saveTrending(10L, publicPost);
        saveTrending(20L, privatePost);
        saveTrending(30L, draftPost);
        saveTrending(40L, deletedPost);

        // when
        FullFeedPostResult result = trendingService.readTrendingPostList(DEFAULT_SEARCH);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResult.PostItemResult::postId)
                .containsExactly(publicPost.getId(), olderEligiblePost.getId());
    }

    @Test
    @DisplayName("트렌딩 피드는 더 리로그 게시글을 반환하지 않는다.")
    void readTrendingPostsExcludesTheRilogPosts() {
        // given
        User author = saveCompletedUser(5L, "표준트렌딩작성자", "standard_trending");
        Blog rilog = saveRilog(author);
        Post standardPost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));

        User theRilogOwner = saveCompletedUser(6L, "더리로그주인", "the_rilog");
        Blog theRilog = saveRilog(theRilogOwner);
        Chapter headlines = saveChapter(theRilog, "headlines", 0);
        Post theRilogPost = savePost(TheRilogPostFixture.publishedNews(
                headlines,
                BASE_PUBLISHED_AT,
                content(paragraph("오늘의 소식"))
        ));
        saveTrending(10L, standardPost);
        saveTrending(20L, theRilogPost);

        // when
        FullFeedPostResult result = trendingService.readTrendingPostList(DEFAULT_SEARCH);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResult.PostItemResult::postId)
                .containsExactly(standardPost.getId());
    }

    @ParameterizedTest(name = "category={0}, blogType={1}, page={2}, size={3}")
    @CsvSource(value = {
            "NONE, NONE, 3, 12, 36, 48, true",
            "DAILY, NONE, 1, 25, 25, 40, false",
            "NONE, COLOG, 2, 25, 40, 40, false",
            "DAILY, COLOG, 0, 50, 0, 40, false"
    }, nullValues = "NONE")
    @DisplayName("전체와 필터별 피드는 36개 제한 없이 요청한 페이지와 다음 페이지 여부를 반환한다")
    void readTrendingPostsPaginatesAllMatchingPostsWithoutTotalLimit(
            Category category, BlogType blogType, int page, int size, int expectedFrom, int expectedTo, boolean hasNext
    ) {
        User author = saveCompletedUser(3L, "필터작성자", "trend_filter");
        Blog rilog = saveRilog(author);
        Blog colog = saveColog(author, "trend_colog");
        List<Long> higherScoreIds = new ArrayList<>();
        List<Long> filteredIds = new ArrayList<>();
        for (int i = 1; i <= 40; i++) {
            Post techRilogPost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
            saveTrending((long) i, techRilogPost);
            higherScoreIds.add(techRilogPost.getId());
            Post dailyCologPost = savePost(PostFixture.dailyPublicPublishedCologPost(rilog, colog, author));
            saveTrending(100L + i, dailyCologPost);
            filteredIds.add(dailyCologPost.getId());
        }

        FullFeedPostResult result = trendingService.readTrendingPostList(
                new FullFeedSearchCommand(category, blogType, page, size)
        );

        List<Long> expectedIds = new ArrayList<>();
        if (category == null && blogType == null) expectedIds.addAll(higherScoreIds);
        expectedIds.addAll(filteredIds);
        assertThat(result.posts())
                .extracting(FullFeedPostResult.PostItemResult::postId)
                .containsExactlyElementsOf(expectedIds.subList(expectedFrom, expectedTo));
        assertThat(result.page()).isEqualTo(page);
        assertThat(result.size()).isEqualTo(size);
        assertThat(result.numberOfElements()).isEqualTo(expectedTo - expectedFrom);
        assertThat(result.hasNext()).isEqualTo(hasNext);
    }

    @Test
    @DisplayName("점수가 같은 트렌딩 글은 트렌딩 ID 내림차순의 Slice와 다음 페이지 여부를 반환한다.")
    void readTrendingPostsPaginatesTiesByTrendingId() {
        // given
        User author = saveCompletedUser(4L, "페이지작성자", "trending_page_author");
        Blog rilog = saveRilog(author);
        Post firstPost = savePost(PostFixture.publicPublishedRilogPostAt(rilog, author, BASE_PUBLISHED_AT));
        Post secondPost = savePost(PostFixture.publicPublishedRilogPostAt(rilog, author, BASE_PUBLISHED_AT));
        Post thirdPost = savePost(PostFixture.publicPublishedRilogPostAt(rilog, author, BASE_PUBLISHED_AT));
        saveTrending(10L, firstPost);
        saveTrending(30L, secondPost);
        saveTrending(20L, thirdPost);
        jdbcTemplate.update("update trending_post set score = 100");
        FullFeedSearchCommand command = new FullFeedSearchCommand(null, null, 0, 2);

        // when
        FullFeedPostResult result = trendingService.readTrendingPostList(command);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResult.PostItemResult::postId)
                .containsExactly(secondPost.getId(), thirdPost.getId());
        assertThat(result.hasNext()).isTrue();
    }

    private User saveCompletedUser(long githubId, String nickname, String slug) {
        User user = UserFixture.user(githubId, "github_user_" + githubId);
        user.completeOnboarding(
                nickname,
                slug,
                "기록하는 개발자입니다.",
                "https://example.com/users/" + githubId + ".png",
                "https://github.com/github_user_" + githubId,
                "user" + githubId + "@example.com"
        );
        return userRepository.saveAndFlush(user);
    }

    private Blog saveRilog(User owner) {
        return blogRepository.saveAndFlush(Blog.createRilog(owner));
    }

    private Blog saveColog(User owner, String slug) {
        return blogRepository.saveAndFlush(Blog.createColog(owner, slug, BlogFixture.cologProfile()));
    }

    private Chapter saveChapter(Blog blog, String name, int order) {
        return chapterRepository.saveAndFlush(Chapter.create(blog, name, order));
    }

    private Post savePost(Post post) {
        if (post.getPublishedAt() != null && post.getPublishedAt().isBefore(BASE_PUBLISHED_AT.minusMonths(1))) {
            ReflectionTestUtils.setField(post, "publishedAt", BASE_PUBLISHED_AT);
        }
        return postFeedQueryRepository.saveAndFlush(post);
    }

    private void saveTrending(Long id, Post post) {
        jdbcTemplate.update(
                "insert into trending_post (id, post_id, score, calculated_at) values (?, ?, ?, ?)",
                id,
                post.getId(),
                1000 - id,
                BASE_PUBLISHED_AT
        );
    }

    private void saveAnchor(CommentAnchor anchor) {
        CommentAnchorSelection selection = anchor.getCommentAnchorSelection();
        commentAnchorSelectionRepository.saveAndFlush(selection);
        commentAnchorRepository.saveAndFlush(anchor);
        if (!anchor.isDeleted()) {
            jdbcTemplate.update(
                    "UPDATE post SET comment_count = comment_count + 1 WHERE id = ?",
                    selection.getPost().getId()
            );
        }
    }
}
