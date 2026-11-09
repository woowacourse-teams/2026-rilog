package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.BlogFeedPostResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.service.dto.command.BlogFeedSearchCommand;
import kr.rilog.domain.post.service.dto.command.FullFeedSearchCommand;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static kr.rilog.domain.blog.entity.enums.BlogType.COLOG;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class FeedServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime BASE_PUBLISHED_AT = LocalDateTime.of(2026, 8, 23, 12, 0);
    private static final FullFeedSearchCommand DEFAULT_FULL_FEED_SEARCH = new FullFeedSearchCommand(
            null,
            null,
            0,
            10
    );
    private static final BlogFeedSearchCommand DEFAULT_SEARCH = new BlogFeedSearchCommand(
            null,
            null,
            null,
            0,
            10
    );

    @Autowired
    private FeedService feedService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private PostFeedQueryRepository postFeedQueryRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Test
    @DisplayName("전체 피드는 개인·팀 블로그 게시글에 실제 작성자, 소속 블로그와 챕터를 연결한다.")
    void readFullFeedJoinsAuthorsOwnersAndChapter() {
        // given
        User rilogAuthor = saveCompletedUser(4L, "개인작성자", "rilog_author");
        Blog rilog = saveRilog(rilogAuthor);
        Post rilogPost = savePost(PostFixture.publicPublishedRilogPost(rilog, rilogAuthor));
        Chapter chapter = saveChapter(rilog, "Spring", 0);
        Post chapterPost = savePost(PostFixture.publicPublishedRilogPost(rilog, rilogAuthor, chapter));
        User cologAuthor = saveCompletedUser(5L, "팀작성자", "colog_author");
        Blog cologAuthorRilog = saveRilog(cologAuthor);
        Blog colog = saveColog(cologAuthor, "team_blog");
        Post cologPost = savePost(PostFixture.publicPublishedColog(cologAuthorRilog, colog, cologAuthor));

        // when
        FullFeedPostResponse result = feedService.readFullFeedPostList(DEFAULT_FULL_FEED_SEARCH);

        // then
        assertThat(result.posts())
                .extracting(
                        FullFeedPostResponse.PostItemResponse::postId,
                        post -> post.author().userId(),
                        post -> post.owner().blogId(),
                        post -> post.owner().slug(),
                        post -> post.owner().profileImageUrl(),
                        post -> post.chapter() == null ? null : post.chapter().chapterId()
                )
                .containsExactlyInAnyOrder(
                        tuple(rilogPost.getId(), rilogAuthor.getId(), rilog.getId(), rilog.getSlug(), rilog.getProfileImageUrl(), null),
                        tuple(chapterPost.getId(), rilogAuthor.getId(), rilog.getId(), rilog.getSlug(), rilog.getProfileImageUrl(), chapter.getId()),
                        tuple(cologPost.getId(), cologAuthor.getId(), colog.getId(), colog.getSlug(), colog.getProfileImageUrl(), null)
                );
    }

    @Test
    @DisplayName("팀 블로그 공개 글 조회는 해당 블로그의 공개 발행 글과 챕터를 반환한다.")
    void readPublicCologPostsReturnsOnlyTargetPublicPublishedPosts() {
        // given
        User author = saveCompletedUser(8L, "팀조회작성자", "team_feed_author");
        Blog rilog = saveRilog(author);
        Blog colog = saveColog(author, "target_team");
        Blog otherColog = saveColog(author, "other_team");
        Chapter chapter = saveChapter(colog, "회고", 2);
        Post olderPost = savePost(PostFixture.publicPublishedColog(rilog, colog, author, BASE_PUBLISHED_AT));
        Post latestPost = saveChapterPostAt(rilog, colog, author, chapter, BASE_PUBLISHED_AT.plusMinutes(1));
        savePost(PostFixture.privatePublishedCologPost(rilog, colog, author));
        savePost(PostFixture.publicPublishedColog(rilog, otherColog, author));

        // when
        BlogFeedPostResponse result = feedService.readBlogPosts(colog.getSlug(), null, DEFAULT_SEARCH);

        // then
        assertThat(result.posts())
                .extracting(BlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(latestPost.getId(), olderPost.getId());
        assertThat(result.posts())
                .extracting(post -> post.owner().blogId())
                .containsOnly(colog.getId());
        assertThat(result.posts().getFirst().chapter().chapterId()).isEqualTo(chapter.getId());
    }

    @ParameterizedTest
    @EnumSource(BlogType.class)
    @DisplayName("로그인한 독자는 다른 작성자의 비공개 글을 블로그 피드에서 볼 수 없다.")
    void readBlogPostsExcludesPrivatePostsOfOtherWriters(BlogType blogType) {
        // given
        User author = saveCompletedUser(11L, "피드작성자", "feed_author");
        User reader = saveCompletedUser(12L, "피드독자", "feed_reader");
        Blog rilog = saveRilog(author);
        Blog blog = blogType == COLOG ? saveColog(author, "visibility_team") : rilog;
        Post publicPost = savePost(blog.isColog()
                ? PostFixture.publicPublishedColog(rilog, blog, author)
                : PostFixture.publicPublishedRilogPost(rilog, author));
        savePost(blog.isColog()
                ? PostFixture.privatePublishedCologPost(rilog, blog, author)
                : PostFixture.privatePublishedRilogPost(rilog, author));

        // when
        BlogFeedPostResponse result = feedService.readBlogPosts(blog.getSlug(), reader.getId(), DEFAULT_SEARCH);

        // then
        assertThat(result.posts()).extracting(BlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(publicPost.getId());
    }

    @ParameterizedTest
    @EnumSource(BlogType.class)
    @DisplayName("챕터 전용 조회는 오래된 글부터 페이지를 나누고 일반 피드는 챕터 필터가 있어도 최신순을 유지한다.")
    void readChapterPostsOldestFirstAndBlogFeedNewestFirst(BlogType blogType) {
        // given
        User author = saveCompletedUser(40L, "순서작성자", "chapter_order_author");
        Blog rilog = saveRilog(author);
        Blog blog = blogType == COLOG ? saveColog(author, "chapter_order_team") : rilog;
        Chapter chapter = saveChapter(blog, "기록", 0);
        Post latest = saveChapterPostAt(rilog, blog, author, chapter, BASE_PUBLISHED_AT.plusMinutes(1));
        Post firstSameTime = saveChapterPostAt(rilog, blog, author, chapter, BASE_PUBLISHED_AT);
        Post secondSameTime = saveChapterPostAt(rilog, blog, author, chapter, BASE_PUBLISHED_AT);

        // when
        BlogFeedPostResponse firstPage = feedService.readChapterPosts(blog.getSlug(), null,
                new BlogFeedSearchCommand(null, chapter.getId(), null, 0, 2));
        BlogFeedPostResponse secondPage = feedService.readChapterPosts(blog.getSlug(), null,
                new BlogFeedSearchCommand(null, chapter.getId(), null, 1, 2));
        BlogFeedPostResponse chapterFilteredFeed = feedService.readBlogPosts(blog.getSlug(), null,
                new BlogFeedSearchCommand(null, chapter.getId(), null, 0, 10));
        BlogFeedPostResponse feed = feedService.readBlogPosts(blog.getSlug(), null, DEFAULT_SEARCH);

        // then
        assertThat(firstPage.posts()).extracting(BlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(firstSameTime.getId(), secondSameTime.getId());
        assertThat(firstPage.hasNext()).isTrue();
        assertThat(secondPage.posts()).extracting(BlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(latest.getId());
        assertThat(secondPage.hasNext()).isFalse();
        assertThat(chapterFilteredFeed.posts()).extracting(BlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(latest.getId(), secondSameTime.getId(), firstSameTime.getId());
        assertThat(feed.posts()).extracting(BlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(latest.getId(), secondSameTime.getId(), firstSameTime.getId());
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

    private Post savePost(Post post) {
        return postFeedQueryRepository.saveAndFlush(post);
    }

    private Post saveChapterPostAt(Blog rilog, Blog blog, User author, Chapter chapter, LocalDateTime publishedAt) {
        Post post = blog.isColog()
                ? PostFixture.publicPublishedColog(rilog, blog, author, chapter)
                : PostFixture.publicPublishedRilogPost(rilog, author, chapter);
        ReflectionTestUtils.setField(post, "publishedAt", publishedAt);
        return savePost(post);
    }

    private Chapter saveChapter(Blog blog, String name, int order) {
        return chapterRepository.saveAndFlush(Chapter.create(blog, name, order));
    }

}
