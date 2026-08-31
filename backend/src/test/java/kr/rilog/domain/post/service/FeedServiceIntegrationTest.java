package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.PublicBlogFeedPostResponse;
import kr.rilog.domain.post.entity.Post;
    import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.service.dto.command.BlogFeedSearchCommand;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static kr.rilog.domain.blog.entity.enums.BlogType.COLOG;
import static kr.rilog.domain.blog.entity.enums.BlogType.RILOG;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_BLOG_FEED_FILTER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class FeedServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime BASE_PUBLISHED_AT = LocalDateTime.of(2026, 8, 23, 12, 0);
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
    @DisplayName("전체 피드는 공개 발행 상태이면서 삭제되지 않은 게시글만 반환한다.")
    void readFullFeedReturnsOnlyActivePublicPublishedPosts() {
        // given
        User author = saveCompletedUser(1L, "피드작성자", "feed-author");
        Blog rilog = saveRilog(author);
        Post publicPublishedPost = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        savePost(PostFixture.privatePublishedRilogPost(rilog, author));
        savePost(PostFixture.publicDraftRilogPost(rilog, author));
        savePost(PostFixture.deletedPublicPublishedRilogPost(rilog, author));

        // when
        FullFeedPostResponse result = feedService.readFullFeedPostList(0, 10);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResponse.PostItemResponse::postId)
                .containsExactly(publicPublishedPost.getId());
    }

    @Test
    @DisplayName("전체 피드는 발행 시각과 게시글 아이디의 내림차순으로 정렬한다.")
    void readFullFeedOrdersByPublishedAtAndIdDescending() {
        // given
        User author = saveCompletedUser(2L, "정렬작성자", "order-author");
        Blog rilog = saveRilog(author);
        Post firstSameTimePost = savePost(PostFixture.publicPublishedRilogPostAt(rilog, author, BASE_PUBLISHED_AT));
        Post secondSameTimePost = savePost(PostFixture.publicPublishedRilogPostAt(rilog, author, BASE_PUBLISHED_AT));
        Post latestPost = savePost(PostFixture.publicPublishedRilogPostAt(rilog, author, BASE_PUBLISHED_AT.plusMinutes(1)));

        // when
        FullFeedPostResponse result = feedService.readFullFeedPostList(0, 10);

        // then
        assertThat(result.posts())
                .extracting(FullFeedPostResponse.PostItemResponse::postId)
                .containsExactly(latestPost.getId(), secondSameTimePost.getId(), firstSameTimePost.getId());
    }

    @Test
    @DisplayName("전체 피드 첫 페이지를 크기 2로 조회하면 최신 두 건과 다음 페이지 정보를 반환한다.")
    void readFullFeedReturnsRequestedSlice() {
        // given
        User author = saveCompletedUser(3L, "페이지작성자", "page-author");
        Blog rilog = saveRilog(author);
        savePost(PostFixture.publicPublishedRilogPostAt(rilog, author, BASE_PUBLISHED_AT));
        Post middlePost = savePost(PostFixture.publicPublishedRilogPostAt(rilog, author, BASE_PUBLISHED_AT.plusMinutes(1)));
        Post latestPost = savePost(PostFixture.publicPublishedRilogPostAt(rilog, author, BASE_PUBLISHED_AT.plusMinutes(2)));

        // when
        FullFeedPostResponse result = feedService.readFullFeedPostList(0, 2);

        // then
        assertSoftly(softly -> {
            softly.assertThat(result.posts())
                    .extracting(FullFeedPostResponse.PostItemResponse::postId)
                    .containsExactly(latestPost.getId(), middlePost.getId());
            softly.assertThat(result.page()).isZero();
            softly.assertThat(result.size()).isEqualTo(2);
            softly.assertThat(result.numberOfElements()).isEqualTo(2);
            softly.assertThat(result.hasNext()).isTrue();
        });
    }

    @Test
    @DisplayName("전체 피드의 개인 블로그 게시글은 작성자와 개인 블로그 정보를 반환한다.")
    void readFullFeedMapsRilogPostAuthorAndOwner() {
        // given
        User author = saveCompletedUser(4L, "개인작성자", "rilog-author");
        Blog rilog = saveRilog(author);
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, author));
        FullFeedPostResponse.PostItemResponse expected = expectedFullFeedItem(post, author, rilog);

        // when
        FullFeedPostResponse result = feedService.readFullFeedPostList(0, 10);

        // then
        assertThat(result.posts()).containsExactly(expected);
    }

    @Test
    @DisplayName("전체 피드의 팀 블로그 게시글은 작성자와 팀 블로그 정보를 반환한다.")
    void readFullFeedMapsCologPostAuthorAndOwner() {
        // given
        User author = saveCompletedUser(5L, "팀작성자", "colog-author");
        Blog rilog = saveRilog(author);
        Blog colog = saveColog(author, "team-blog");
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, author));
        FullFeedPostResponse.PostItemResponse expected = expectedFullFeedItem(post, author, colog);

        // when
        FullFeedPostResponse result = feedService.readFullFeedPostList(0, 10);

        // then
        assertThat(result.posts()).containsExactly(expected);
    }

    @Test
    @DisplayName("전체 피드는 게시글이 속한 챕터의 전체 정보를 반환한다.")
    void readFullFeedReturnsChapter() {
        // given
        User author = saveCompletedUser(10L, "전체챕터작성자", "full-chapter-author");
        Blog rilog = saveRilog(author);
        Chapter chapter = saveChapter(rilog, "Spring", 0);
        savePost(PostFixture.publicPublishedRilogPost(rilog, author, chapter));

        // when
        FullFeedPostResponse result = feedService.readFullFeedPostList(0, 10);

        // then
        assertThat(result.posts().getFirst().chapter())
                .isEqualTo(new ChapterResponse(chapter.getId(), chapter.getName(), chapter.getOrder()));
    }

    @Test
    @DisplayName("개인 블로그 공개 글 조회는 해당 개인 블로그의 공개 발행 상태인 게시글만 반환한다.")
    void readPublicRilogPostsReturnsOnlyTargetPublicPublishedPosts() {
        // given
        User targetAuthor = saveCompletedUser(6L, "조회작성자", "target-rilog");
        Blog targetRilog = saveRilog(targetAuthor);
        User otherAuthor = saveCompletedUser(7L, "다른작성자", "other-rilog");
        Blog otherRilog = saveRilog(otherAuthor);
        Post targetPost = savePost(PostFixture.publicPublishedRilogPost(targetRilog, targetAuthor));
        savePost(PostFixture.privatePublishedRilogPost(targetRilog, targetAuthor));
        savePost(PostFixture.publicDraftRilogPost(targetRilog, targetAuthor));
        savePost(PostFixture.deletedPublicPublishedRilogPost(targetRilog, targetAuthor));
        savePost(PostFixture.publicPublishedRilogPost(otherRilog, otherAuthor));

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(targetRilog.getSlug(), null, DEFAULT_SEARCH);

        // then
        assertThat(result.type()).isEqualTo(RILOG.name());
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(targetPost.getId());
    }

    @Test
    @DisplayName("개인 블로그 공개 글 목록은 게시글이 속한 챕터의 전체 정보를 반환한다.")
    void readPublicRilogPostsReturnsChapter() {
        // given
        User author = saveCompletedUser(11L, "개인챕터작성자", "rilog-chapter-author");
        Blog rilog = saveRilog(author);
        Chapter chapter = saveChapter(rilog, "Java", 1);
        savePost(PostFixture.publicPublishedRilogPost(rilog, author, chapter));

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(rilog.getSlug(), null, DEFAULT_SEARCH);

        // then
        assertThat(result.posts().getFirst().chapter())
                .isEqualTo(new ChapterResponse(chapter.getId(), chapter.getName(), chapter.getOrder()));
    }

    @Test
    @DisplayName("팀 블로그 공개 글 조회는 해당 팀 블로그의 공개 발행 상태인 게시글만 반환한다.")
    void readPublicCologPostsReturnsOnlyTargetPublicPublishedPosts() {
        // given
        User author = saveCompletedUser(8L, "팀조회작성자", "team-feed-author");
        Blog rilog = saveRilog(author);
        Blog colog = saveColog(author, "target-team");
        Blog otherColog = saveColog(author, "other-team");
        Post olderPost = savePost(PostFixture.publicPublishedColog(rilog, colog, author, BASE_PUBLISHED_AT));
        Post latestPost = savePost(PostFixture.publicPublishedColog(rilog, colog, author, BASE_PUBLISHED_AT.plusMinutes(1)));
        savePost(PostFixture.privatePublishedCologPost(rilog, colog, author));
        savePost(PostFixture.publicPublishedColog(rilog, otherColog, author));

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(colog.getSlug(), null, DEFAULT_SEARCH);

        // then
        assertThat(result.type()).isEqualTo(COLOG.name());
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(latestPost.getId(), olderPost.getId());
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::owner)
                .containsOnly(expectedPublicBlogOwner(colog));
    }

    @Test
    @DisplayName("팀 블로그 공개 글 목록은 게시글이 속한 챕터의 전체 정보를 반환한다.")
    void readPublicCologPostsReturnsChapter() {
        // given
        User author = saveCompletedUser(12L, "팀챕터작성자", "colog-chapter-author");
        Blog rilog = saveRilog(author);
        Blog colog = saveColog(author, "chapter-team");
        Chapter chapter = saveChapter(colog, "회고", 2);
        savePost(PostFixture.publicPublishedColog(rilog, colog, author, chapter));

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(colog.getSlug(), null, DEFAULT_SEARCH);

        // then
        assertThat(result.posts().getFirst().chapter())
                .isEqualTo(new ChapterResponse(chapter.getId(), chapter.getName(), chapter.getOrder()));
    }

    @Test
    @DisplayName("Rilog 피드는 소유자가 Rilog와 Colog에 발행한 공개 글을 모두 반환한다.")
    void readRilogFeedReturnsPublicPostsPublishedToRilogAndColog() {
        // given
        User owner = saveCompletedUser(13L, "통합피드작성자", "combined-feed-owner");
        Blog rilog = saveRilog(owner);
        Blog colog = saveColog(owner, "combined-team");
        Post rilogPost = savePost(PostFixture.publicPublishedRilogPost(rilog, owner));
        Post cologPost = savePost(PostFixture.publicPublishedColog(rilog, colog, owner));

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(rilog.getSlug(), null, DEFAULT_SEARCH);

        // then
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(cologPost.getId(), rilogPost.getId());
    }

    @Test
    @DisplayName("본인의 Rilog 피드는 발행 대상과 관계없이 본인이 작성한 비공개 글을 함께 반환한다.")
    void readOwnRilogFeedReturnsPrivatePostsPublishedToRilogAndColog() {
        // given
        User owner = saveCompletedUser(14L, "비공개피드작성자", "private-feed-owner");
        Blog rilog = saveRilog(owner);
        Blog colog = saveColog(owner, "private-team");
        Post privateRilogPost = savePost(PostFixture.privatePublishedRilogPost(rilog, owner));
        Post privateCologPost = savePost(PostFixture.privatePublishedCologPost(rilog, colog, owner));

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(
                rilog.getSlug(),
                owner.getId(),
                DEFAULT_SEARCH
        );

        // then
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(privateCologPost.getId(), privateRilogPost.getId());
    }

    @Test
    @DisplayName("다른 사용자가 Rilog 피드를 조회하면 소유자의 비공개 글을 반환하지 않는다.")
    void readRilogFeedByOtherUserExcludesPrivatePosts() {
        // given
        User owner = saveCompletedUser(15L, "피드소유자", "feed-owner");
        Blog rilog = saveRilog(owner);
        User requester = saveCompletedUser(16L, "다른조회자", "other-requester");
        Post publicPost = savePost(PostFixture.publicPublishedRilogPost(rilog, owner));
        savePost(PostFixture.privatePublishedRilogPost(rilog, owner));

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(
                rilog.getSlug(),
                requester.getId(),
                DEFAULT_SEARCH
        );

        // then
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(publicPost.getId());
    }

    @Test
    @DisplayName("Colog 피드는 공개 글과 로그인 사용자가 해당 Colog에 발행한 비공개 글만 반환한다.")
    void readCologFeedReturnsPublicPostsAndRequestersPrivatePosts() {
        // given
        User requester = saveCompletedUser(17L, "비공개조회자", "private-requester");
        Blog requesterRilog = saveRilog(requester);
        User otherAuthor = saveCompletedUser(18L, "다른작성자", "other-private-author");
        Blog otherRilog = saveRilog(otherAuthor);
        Blog colog = saveColog(requester, "private-colog");
        Post publicPost = savePost(PostFixture.publicPublishedColog(otherRilog, colog, otherAuthor));
        Post requesterPrivatePost = savePost(PostFixture.privatePublishedCologPost(requesterRilog, colog, requester));
        savePost(PostFixture.privatePublishedCologPost(otherRilog, colog, otherAuthor));

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(
                colog.getSlug(),
                requester.getId(),
                DEFAULT_SEARCH
        );

        // then
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(requesterPrivatePost.getId(), publicPost.getId());
    }

    @Test
    @DisplayName("Rilog 피드의 카테고리 필터는 발행 대상과 관계없이 해당 카테고리 글만 반환한다.")
    void readRilogFeedFiltersCategoryAcrossPublishingTargets() {
        // given
        User owner = saveCompletedUser(19L, "카테고리작성자", "category-owner");
        Blog rilog = saveRilog(owner);
        Blog colog = saveColog(owner, "category-team");
        savePost(PostFixture.publicPublishedRilogPost(rilog, owner));
        Post dailyCologPost = savePost(PostFixture.dailyPublicPublishedCologPost(rilog, colog, owner));
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(Category.DAILY, null, null, 0, 10);

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(rilog.getSlug(), null, command);

        // then
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(dailyCologPost.getId());
    }

    @Test
    @DisplayName("Colog 피드의 카테고리 필터는 해당 Colog에 발행된 카테고리 글만 반환한다.")
    void readCologFeedFiltersCategory() {
        // given
        User author = saveCompletedUser(20L, "팀카테고리작성자", "colog-cat-author");
        Blog rilog = saveRilog(author);
        Blog colog = saveColog(author, "filtered-colog");
        savePost(PostFixture.publicPublishedColog(rilog, colog, author));
        Post dailyPost = savePost(PostFixture.dailyPublicPublishedCologPost(rilog, colog, author));
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(Category.DAILY, null, null, 0, 10);

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(colog.getSlug(), null, command);

        // then
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(dailyPost.getId());
    }

    @Test
    @DisplayName("Rilog 피드의 챕터 필터는 해당 Rilog 챕터에 연결된 글만 반환한다.")
    void readRilogFeedFiltersChapter() {
        // given
        User owner = saveCompletedUser(21L, "개인챕터필터작성자", "rilog-chapter-filter");
        Blog rilog = saveRilog(owner);
        Chapter targetChapter = saveChapter(rilog, "Java", 0);
        Chapter otherChapter = saveChapter(rilog, "Spring", 1);
        Post targetPost = savePost(PostFixture.publicPublishedRilogPost(rilog, owner, targetChapter));
        savePost(PostFixture.publicPublishedRilogPost(rilog, owner, otherChapter));
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(null, targetChapter.getId(), null, 0, 10);

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(rilog.getSlug(), null, command);

        // then
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(targetPost.getId());
    }

    @Test
    @DisplayName("Rilog 피드의 챕터 필터에 다른 블로그의 챕터를 전달하면 글을 반환하지 않는다.")
    void readRilogFeedExcludesChapterOfOtherBlog() {
        // given
        User owner = saveCompletedUser(27L, "다른챕터필터작성자", "other-chapter-owner");
        Blog rilog = saveRilog(owner);
        Blog colog = saveColog(owner, "other-chapter-team");
        Chapter cologChapter = saveChapter(colog, "팀 회고", 0);
        savePost(PostFixture.publicPublishedColog(rilog, colog, owner, cologChapter));
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(null, cologChapter.getId(), null, 0, 10);

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(rilog.getSlug(), null, command);

        // then
        assertThat(result.posts()).isEmpty();
    }

    @Test
    @DisplayName("Colog 피드의 챕터 필터는 공개 글과 요청자의 비공개 글 중 해당 챕터 글만 반환한다.")
    void readCologFeedFiltersChapterAndPreservesPrivatePostPolicy() {
        // given
        User requester = saveCompletedUser(22L, "팀챕터조회자", "chapter-requester");
        Blog rilog = saveRilog(requester);
        Blog colog = saveColog(requester, "chapter-filter-team");
        Chapter targetChapter = saveChapter(colog, "회고", 0);
        Chapter otherChapter = saveChapter(colog, "기술", 1);
        Post publicPost = savePost(PostFixture.publicPublishedColog(rilog, colog, requester, targetChapter));
        Post privatePost = savePost(PostFixture.privatePublishedCologPost(rilog, colog, requester, targetChapter));
        savePost(PostFixture.publicPublishedColog(rilog, colog, requester, otherChapter));
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(null, targetChapter.getId(), null, 0, 10);

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(
                colog.getSlug(),
                requester.getId(),
                command
        );

        // then
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(privatePost.getId(), publicPost.getId());
    }

    @Test
    @DisplayName("Rilog의 대상 Colog와 카테고리 필터는 소유자가 해당 Colog에 작성한 카테고리 글만 반환한다.")
    void readRilogFeedFiltersTargetCologAndCategory() {
        // given
        User owner = saveCompletedUser(23L, "대상팀작성자", "target-colog-owner");
        Blog rilog = saveRilog(owner);
        Blog targetColog = saveColog(owner, "target-colog");
        Blog otherColog = saveColog(owner, "another-colog");
        Post targetDailyPost = savePost(PostFixture.dailyPublicPublishedCologPost(rilog, targetColog, owner));
        Post targetPrivateDailyPost = savePost(
                PostFixture.dailyPrivatePublishedCologPost(rilog, targetColog, owner)
        );
        savePost(PostFixture.publicPublishedColog(rilog, targetColog, owner));
        savePost(PostFixture.dailyPublicPublishedCologPost(rilog, otherColog, owner));
        savePost(PostFixture.dailyPublicPublishedRilogPost(rilog, owner));
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(
                Category.DAILY,
                null,
                targetColog.getSlug(),
                0,
                10
        );

        // when
        PublicBlogFeedPostResponse result = feedService.readBlogPosts(rilog.getSlug(), owner.getId(), command);

        // then
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(targetPrivateDailyPost.getId(), targetDailyPost.getId());
    }

    @Test
    @DisplayName("대상 Colog 필터와 챕터 필터를 함께 사용하면 예외가 발생한다.")
    void readRilogFeedRejectsTargetCologWithChapter() {
        // given
        User owner = saveCompletedUser(24L, "필터검증작성자", "filter-owner");
        Blog rilog = saveRilog(owner);
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(null, 1L, "target-colog", 0, 10);

        // when & then
        assertThatThrownBy(() -> feedService.readBlogPosts(rilog.getSlug(), null, command))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_BLOG_FEED_FILTER.getMessage());
    }

    @Test
    @DisplayName("Colog 피드에 대상 Colog 필터를 사용하면 예외가 발생한다.")
    void readCologFeedRejectsTargetCologFilter() {
        // given
        User owner = saveCompletedUser(25L, "팀필터검증자", "colog-filter-owner");
        Blog colog = saveColog(owner, "main-colog");
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(null, null, "target-colog", 0, 10);

        // when & then
        assertThatThrownBy(() -> feedService.readBlogPosts(colog.getSlug(), null, command))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_BLOG_FEED_FILTER.getMessage());
    }

    @Test
    @DisplayName("대상 Colog 필터의 블로그가 존재하지 않으면 예외가 발생한다.")
    void readRilogFeedThrowsWhenTargetCologDoesNotExist() {
        // given
        User owner = saveCompletedUser(26L, "없는팀조회자", "missing-colog-owner");
        Blog rilog = saveRilog(owner);
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(null, null, "missing-colog", 0, 10);

        // when & then
        assertThatThrownBy(() -> feedService.readBlogPosts(rilog.getSlug(), null, command))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("존재하지 않는 슬러그로 공개 블로그 글을 조회하면 예외가 발생한다.")
    void readPublicBlogPostsThrowsWhenBlogDoesNotExist() {
        // when & then
        assertThatThrownBy(() -> feedService.readBlogPosts("missing-blog", null, DEFAULT_SEARCH))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("삭제된 블로그의 공개 글을 조회하면 예외가 발생한다.")
    void readPublicBlogPostsThrowsWhenBlogIsDeleted() {
        // given
        User owner = saveCompletedUser(9L, "삭제블로그주인", "deleted-owner");
        Blog deletedBlog = Blog.createColog(owner, "deleted-blog", BlogFixture.cologProfile());
        deletedBlog.delete();
        blogRepository.saveAndFlush(deletedBlog);

        // when & then
        assertThatThrownBy(() -> feedService.readBlogPosts(deletedBlog.getSlug(), null, DEFAULT_SEARCH))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_NOT_FOUND.getMessage());
    }

    private User saveCompletedUser(long githubId, String nickname, String slug) {
        User user = UserFixture.user(githubId, "github-user-" + githubId);
        user.completeOnboarding(
                nickname,
                slug,
                "기록하는 개발자입니다.",
                "https://example.com/users/" + githubId + ".png",
                "https://github.com/github-user-" + githubId,
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

    private Chapter saveChapter(Blog blog, String name, int order) {
        return chapterRepository.saveAndFlush(Chapter.create(blog, name, order));
    }

    private FullFeedPostResponse.PostItemResponse expectedFullFeedItem(Post post, User author, Blog owner) {
        return new FullFeedPostResponse.PostItemResponse(
                post.getId(),
                post.getTitle(),
                post.getThumbnailImageUrl(),
                post.getCategory().getName(),
                post.getVisibility().name(),
                post.getPublishedAt(),
                ChapterResponse.from(post.getChapter()),
                new FullFeedPostResponse.AuthorResponse(
                        author.getId(),
                        author.getNickname(),
                        author.getSlug(),
                        author.getProfileImageUrl()
                ),
                new FullFeedPostResponse.OwnerResponse(
                        owner.getBlogType(),
                        owner.getId(),
                        owner.getSlug(),
                        owner.getName(),
                        owner.getProfileImageUrl()
                )
        );
    }

    private PublicBlogFeedPostResponse.OwnerResponse expectedPublicBlogOwner(Blog owner) {
        return new PublicBlogFeedPostResponse.OwnerResponse(
                owner.getBlogType(),
                owner.getId(),
                owner.getSlug(),
                owner.getName(),
                owner.getProfileImageUrl()
        );
    }

}
