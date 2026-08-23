package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.PublicBlogFeedPostResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
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
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class FeedServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime BASE_PUBLISHED_AT = LocalDateTime.of(2026, 8, 23, 12, 0);

    @Autowired
    private FeedService feedService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private PostFeedQueryRepository postFeedQueryRepository;

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
        PublicBlogFeedPostResponse result = feedService.readPublicBlogPosts(targetRilog.getSlug(), 0, 10);

        // then
        assertThat(result.type()).isEqualTo(RILOG.name());
        assertThat(result.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(targetPost.getId());
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
        PublicBlogFeedPostResponse result = feedService.readPublicBlogPosts(colog.getSlug(), 0, 10);

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
    @DisplayName("존재하지 않는 슬러그로 공개 블로그 글을 조회하면 예외가 발생한다.")
    void readPublicBlogPostsThrowsWhenBlogDoesNotExist() {
        // when & then
        assertThatThrownBy(() -> feedService.readPublicBlogPosts("missing-blog", 0, 10))
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
        assertThatThrownBy(() -> feedService.readPublicBlogPosts(deletedBlog.getSlug(), 0, 10))
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

    private FullFeedPostResponse.PostItemResponse expectedFullFeedItem(Post post, User author, Blog owner) {
        return new FullFeedPostResponse.PostItemResponse(
                post.getId(),
                post.getTitle(),
                post.getThumbnailImageUrl(),
                post.getCategory().getName(),
                post.getVisibility().name(),
                post.getPublishedAt(),
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
