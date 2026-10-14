package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.service.dto.command.FullFeedSearchCommand;
import kr.rilog.domain.post.service.dto.result.FullFeedPostResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.TheRilogPostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;

import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;

class TrendingServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime BASE_PUBLISHED_AT = LocalDateTime.of(2026, 9, 30, 12, 0);
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

    @Test
    @DisplayName("트렌딩 피드는 발행 시각과 관계없이 HardTrending 아이디 오름차순으로 반환한다.")
    void readTrendingPostsOrdersByHardTrendingId() {
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
        saveHardTrending(10L, olderPost);
        saveHardTrending(20L, newerPost);

        // when
        FullFeedPostResult result = trendingService.readTrendingPostList(DEFAULT_SEARCH);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResult.PostItemResult::postId)
                .containsExactly(olderPost.getId(), newerPost.getId());
    }

    @Test
    @DisplayName("트렌딩 피드는 공개 발행 상태이면서 삭제되지 않은 게시글만 반환한다.")
    void readTrendingPostsReturnsOnlyReadablePublishedPosts() {
        // given
        User author = saveCompletedUser(2L, "상태필터작성자", "trend_status");
        Blog rilog = saveRilog(author);
        Post publicPost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        Post privatePost = savePost(PostFixture.privatePublishedRilogPost(rilog, author));
        Post draftPost = savePost(PostFixture.publicDraftRilogPost(rilog, author));
        Post deletedPost = savePost(PostFixture.deletedPublicPublishedRilogPost(rilog, author));
        saveHardTrending(10L, publicPost);
        saveHardTrending(20L, privatePost);
        saveHardTrending(30L, draftPost);
        saveHardTrending(40L, deletedPost);

        // when
        FullFeedPostResult result = trendingService.readTrendingPostList(DEFAULT_SEARCH);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResult.PostItemResult::postId)
                .containsExactly(publicPost.getId());
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
        saveHardTrending(10L, standardPost);
        saveHardTrending(20L, theRilogPost);

        // when
        FullFeedPostResult result = trendingService.readTrendingPostList(DEFAULT_SEARCH);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResult.PostItemResult::postId)
                .containsExactly(standardPost.getId());
    }

    @Test
    @DisplayName("트렌딩 피드는 기존 전체 피드와 같은 카테고리와 블로그 유형 필터를 적용한다.")
    void readTrendingPostsAppliesFeedFilters() {
        // given
        User author = saveCompletedUser(3L, "필터작성자", "trend_filter");
        Blog rilog = saveRilog(author);
        Blog colog = saveColog(author, "trend_colog");
        Post rilogPost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        Post dailyCologPost = savePost(PostFixture.dailyPublicPublishedCologPost(rilog, colog, author));
        saveHardTrending(10L, rilogPost);
        saveHardTrending(20L, dailyCologPost);
        FullFeedSearchCommand command = new FullFeedSearchCommand(
                Category.DAILY,
                BlogType.COLOG,
                0,
                10
        );

        // when
        FullFeedPostResult result = trendingService.readTrendingPostList(command);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResult.PostItemResult::postId)
                .containsExactly(dailyCologPost.getId());
    }

    @Test
    @DisplayName("트렌딩 피드는 Slice 페이지 정보와 다음 페이지 존재 여부를 반환한다.")
    void readTrendingPostsReturnsRequestedSlice() {
        // given
        User author = saveCompletedUser(4L, "페이지작성자", "trending_page_author");
        Blog rilog = saveRilog(author);
        Post firstPost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        Post secondPost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        Post thirdPost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        saveHardTrending(10L, firstPost);
        saveHardTrending(20L, secondPost);
        saveHardTrending(30L, thirdPost);
        FullFeedSearchCommand command = new FullFeedSearchCommand(null, null, 0, 2);

        // when
        FullFeedPostResult result = trendingService.readTrendingPostList(command);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResult.PostItemResult::postId)
                .containsExactly(firstPost.getId(), secondPost.getId());
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
        return postFeedQueryRepository.saveAndFlush(post);
    }

    private void saveHardTrending(Long id, Post post) {
        jdbcTemplate.update(
                "insert into hard_trending (id, post_id) values (?, ?)",
                id,
                post.getId()
        );
    }
}
