package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.BlogFeedPostResponse;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.post.service.dto.command.BlogFeedSearchCommand;
import kr.rilog.domain.post.service.dto.command.FullFeedSearchCommand;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_FEED_FILTER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long COLOG_ID = 1L;
    private static final Long RILOG_ID = 2L;
    private static final String COLOG_SLUG = "team_colog";
    private static final String RILOG_SLUG = "writer";
    private static final int PAGE = 1;
    private static final int SIZE = 2;
    private static final FullFeedSearchCommand DEFAULT_FULL_FEED_SEARCH = new FullFeedSearchCommand(
            null,
            null,
            PAGE,
            SIZE
    );
    private static final BlogFeedSearchCommand DEFAULT_SEARCH = new BlogFeedSearchCommand(
            null,
            null,
            null,
            PAGE,
            SIZE
    );

    @Mock
    private PostFeedQueryRepository postFeedQueryRepository;

    @Mock
    private BlogRepository blogRepository;

    private FeedService feedService;

    @BeforeEach
    void setUp() {
        feedService = new FeedService(postFeedQueryRepository, blogRepository);
    }

    @Test
    @DisplayName("전체 피드는 공개 상태와 필터 및 페이지 조건으로 발행된 게시글을 조회한다.")
    void readFullFeedPostListRequestsPublishedPublicPosts() {
        // given
        FullFeedSearchCommand command = new FullFeedSearchCommand(Category.DAILY, BlogType.COLOG, PAGE, SIZE);
        PageRequest pageable = PageRequest.of(PAGE, SIZE);
        when(postFeedQueryRepository.findFullFeedWithInlineCommentCount(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                Category.DAILY,
                BlogType.COLOG,
                pageable
        )).thenReturn(new SliceImpl<>(List.of(), pageable, false));

        // when
        feedService.readFullFeedPostList(command);

        // then
        verify(postFeedQueryRepository).findFullFeedWithInlineCommentCount(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                Category.DAILY,
                BlogType.COLOG,
                pageable
        );
    }

    @Test
    @DisplayName("전체 피드 조회 결과에 게시글과 페이지 정보가 포함된다")
    void readFullFeedPostListReturnsPostsAndPagination() {
        // given
        PageRequest pageable = PageRequest.of(PAGE, SIZE);
        List<PostFullFeedRow> rows = List.of(
                createCologFeedRow(2L),
                createFeedRow(1L)
        );
        when(postFeedQueryRepository.findFullFeedWithInlineCommentCount(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                null,
                null,
                pageable
        )).thenReturn(new SliceImpl<>(rows, pageable, true));

        // when
        FullFeedPostResponse response = feedService.readFullFeedPostList(DEFAULT_FULL_FEED_SEARCH);

        // then
        FullFeedPostResponse.AuthorResponse author =
                new FullFeedPostResponse.AuthorResponse(1L, "작성자", "writer", "https://example.com/profile.png");
        assertThat(response.posts()).containsExactly(
                new FullFeedPostResponse.PostItemResponse(
                        2L, "팀 게시글 제목", "https://example.com/team_thumbnail.png",
                        Category.TECH.getName(), "PUBLIC", LocalDateTime.of(2026, 8, 13, 12, 0), 3L,
                        new ChapterResponse(10L, "회고", 2), author,
                        new FullFeedPostResponse.OwnerResponse(
                                BlogType.COLOG, COLOG_ID, COLOG_SLUG, "팀 블로그", "https://example.com/colog_logo.png"
                        )
                ),
                new FullFeedPostResponse.PostItemResponse(
                        1L, "게시글 제목", "https://example.com/thumbnail.png",
                        Category.TECH.getName(), "PUBLIC", LocalDateTime.of(2026, 8, 13, 12, 0), 0L,
                        null, author,
                        new FullFeedPostResponse.OwnerResponse(
                                BlogType.RILOG, RILOG_ID, RILOG_SLUG, "작성자", "https://example.com/profile.png"
                        )
                )
        );
        assertThat(response.page()).isEqualTo(PAGE);
        assertThat(response.size()).isEqualTo(SIZE);
        assertThat(response.numberOfElements()).isEqualTo(rows.size());
        assertThat(response.hasNext()).isTrue();
    }

    @Test
    @DisplayName("공개 블로그 게시글 목록은 RILOG slug로 작성자의 공개 게시글을 조회한다")
    void readPublicBlogPostsRequestsPublishedPublicPostsOfRilog() {
        // given
        Blog rilog = createRilog();
        PageRequest pageable = PageRequest.of(PAGE, SIZE, Sort.by(Sort.Direction.DESC, "publishedAt", "id"));
        List<PostFullFeedRow> rows = List.of(
                createFeedRow(2L),
                createCologFeedRow(1L)
        );
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG))).thenReturn(Optional.of(rilog));
        when(postFeedQueryRepository.findRilogFeedPosts(
                RILOG_ID,
                null,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                null,
                null,
                null,
                pageable
        )).thenReturn(new SliceImpl<>(rows, pageable, true));

        // when
        BlogFeedPostResponse response = feedService.readBlogPosts(RILOG_SLUG, null, DEFAULT_SEARCH);

        // then
        assertThat(response.type()).isEqualTo("RILOG");
        assertThat(response.posts())
                .extracting(BlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(2L, 1L);
        assertThat(response.posts())
                .extracting(post -> post.author().nickname())
                .containsExactly("작성자", "작성자");
        assertThat(response.posts().get(0).owner())
                .extracting(BlogFeedPostResponse.OwnerResponse::type)
                .isEqualTo(BlogType.RILOG);
        assertThat(response.posts().get(1).owner())
                .extracting(
                        BlogFeedPostResponse.OwnerResponse::type,
                        BlogFeedPostResponse.OwnerResponse::slug
                )
                .containsExactly(BlogType.COLOG, COLOG_SLUG);
        assertThat(response.page()).isEqualTo(PAGE);
        assertThat(response.hasNext()).isTrue();
        verify(postFeedQueryRepository).findRilogFeedPosts(
                RILOG_ID,
                null,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                null,
                null,
                null,
                pageable
        );
    }

    @Test
    @DisplayName("공개 블로그 게시글 목록은 COLOG slug로 팀의 공개 게시글을 조회한다")
    void readPublicBlogPostsRequestsPublishedPublicPostsOfColog() {
        // given
        Blog colog = createColog();
        PageRequest pageable = PageRequest.of(PAGE, SIZE, Sort.by(Sort.Direction.DESC, "publishedAt", "id"));
        List<PostFullFeedRow> rows = List.of(
                createCologFeedRow(2L),
                createCologFeedRow(1L)
        );
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(COLOG_SLUG))).thenReturn(Optional.of(colog));
        when(postFeedQueryRepository.findCologFeedPosts(
                COLOG_ID,
                null,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                null,
                null,
                pageable
        )).thenReturn(new SliceImpl<>(rows, pageable, false));

        // when
        BlogFeedPostResponse response = feedService.readBlogPosts(COLOG_SLUG, null, DEFAULT_SEARCH);

        // then
        assertThat(response.type()).isEqualTo("COLOG");
        assertThat(response.posts())
                .extracting(BlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(2L, 1L);
        assertThat(response.posts())
                .extracting(post -> post.author().nickname())
                .containsExactly("작성자", "작성자");
        assertThat(response.posts()).extracting(BlogFeedPostResponse.PostItemResponse::owner)
                .containsOnly(new BlogFeedPostResponse.OwnerResponse(
                        BlogType.COLOG, COLOG_ID, COLOG_SLUG, "팀 블로그", "https://example.com/colog_logo.png"
                ));
        assertThat(response.posts().getFirst().chapter()).isEqualTo(new ChapterResponse(10L, "회고", 2));
        assertThat(response.size()).isEqualTo(SIZE);
        assertThat(response.hasNext()).isFalse();
        verify(postFeedQueryRepository).findCologFeedPosts(
                COLOG_ID,
                null,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                null,
                null,
                pageable
        );
    }

    @Test
    @DisplayName("존재하지 않거나 삭제된 공개 블로그의 게시글 목록을 조회하면 게시글을 조회하지 않고 예외가 발생한다")
    void readPublicBlogPostsThrowsExceptionWhenBlogDoesNotExist() {
        // given
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("unknown"))).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> feedService.readBlogPosts("unknown", null, DEFAULT_SEARCH))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_NOT_FOUND);
        verifyNoInteractions(postFeedQueryRepository);
    }

    @Test
    @DisplayName("개인 블로그 피드에서 대상 팀 블로그 필터와 챕터 필터를 함께 사용할 수 없다.")
    void readRilogFeedRejectsTargetCologWithChapter() {
        // given
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG)))
                .thenReturn(Optional.of(createRilog()));
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(null, 1L, COLOG_SLUG, PAGE, SIZE);

        // when
        Throwable thrown = catchThrowable(() -> feedService.readBlogPosts(RILOG_SLUG, null, command));

        // then
        assertThat(thrown)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_FEED_FILTER.getMessage());
        verifyNoInteractions(postFeedQueryRepository);
    }

    @Test
    @DisplayName("팀 블로그 피드에서는 대상 팀 블로그 필터를 사용할 수 없다.")
    void readCologFeedRejectsTargetCologFilter() {
        // given
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(COLOG_SLUG)))
                .thenReturn(Optional.of(createColog()));
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(null, null, "other_colog", PAGE, SIZE);

        // when
        Throwable thrown = catchThrowable(() -> feedService.readBlogPosts(COLOG_SLUG, null, command));

        // then
        assertThat(thrown)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_FEED_FILTER.getMessage());
        verifyNoInteractions(postFeedQueryRepository);
    }

    @Test
    @DisplayName("대상 Colog가 없으면 Rilog 피드를 조회하지 않는다.")
    void readRilogFeedRejectsMissingTargetColog() {
        // given
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(null, null, COLOG_SLUG, PAGE, SIZE);
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG)))
                .thenReturn(Optional.of(createRilog()));
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> feedService.readBlogPosts(RILOG_SLUG, null, command))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_NOT_FOUND);
        verifyNoInteractions(postFeedQueryRepository);
    }

    @Test
    @DisplayName("Rilog 피드는 대상 팀의 ID와 카테고리를 저장소에 전달한다.")
    void readRilogFeedRequestsTargetCologAndCategory() {
        // given
        long requesterId = 42L;
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(Category.TECH, null, COLOG_SLUG, PAGE, SIZE);
        PageRequest pageable = PageRequest.of(PAGE, SIZE, Sort.by(Sort.Direction.DESC, "publishedAt", "id"));
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG))).thenReturn(Optional.of(createRilog()));
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(createColog()));
        when(postFeedQueryRepository.findRilogFeedPosts(
                RILOG_ID, requesterId, PostStatus.PUBLISHED, PostVisibility.PUBLIC, Category.TECH, null, COLOG_ID, pageable
        )).thenReturn(new SliceImpl<>(List.of(), pageable, false));

        // when
        feedService.readBlogPosts(RILOG_SLUG, requesterId, command);

        // then
        verify(postFeedQueryRepository).findRilogFeedPosts(
                RILOG_ID, requesterId, PostStatus.PUBLISHED, PostVisibility.PUBLIC, Category.TECH, null, COLOG_ID, pageable
        );
    }

    @Test
    @DisplayName("Colog 피드는 요청자와 카테고리, 챕터 조건을 저장소에 전달한다.")
    void readCologFeedRequestsCategoryAndChapter() {
        // given
        long requesterId = 42L;
        long chapterId = 10L;
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(Category.TECH, chapterId, null, PAGE, SIZE);
        PageRequest pageable = PageRequest.of(PAGE, SIZE, Sort.by(Sort.Direction.DESC, "publishedAt", "id"));
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(COLOG_SLUG))).thenReturn(Optional.of(createColog()));
        when(postFeedQueryRepository.findCologFeedPosts(
                COLOG_ID, requesterId, PostStatus.PUBLISHED, PostVisibility.PUBLIC, Category.TECH, chapterId, pageable
        )).thenReturn(new SliceImpl<>(List.of(), pageable, false));

        // when
        feedService.readBlogPosts(COLOG_SLUG, requesterId, command);

        // then
        verify(postFeedQueryRepository).findCologFeedPosts(
                COLOG_ID, requesterId, PostStatus.PUBLISHED, PostVisibility.PUBLIC, Category.TECH, chapterId, pageable
        );
    }

    private PostFullFeedRow createFeedRow(Long postId) {
        return new PostFullFeedRow(
                postId,
                "게시글 제목",
                "https://example.com/thumbnail.png",
                Category.TECH,
                PostVisibility.PUBLIC,
                LocalDateTime.of(2026, 8, 13, 12, 0),
                null,
                null,
                null,
                1L,
                "작성자",
                "writer",
                "https://example.com/profile.png",
                BlogType.RILOG,
                RILOG_ID,
                RILOG_SLUG,
                "작성자",
                "https://example.com/profile.png"
        );
    }

    private Blog createColog() {
        return Blog.builder()
                .id(COLOG_ID)
                .slug(Slug.from(COLOG_SLUG))
                .profile(createCologProfile())
                .blogType(BlogType.COLOG)
                .build();
    }

    private Blog createRilog() {
        return Blog.builder()
                .id(RILOG_ID)
                .slug(Slug.from(RILOG_SLUG))
                .profile(createRilogProfile())
                .blogType(BlogType.RILOG)
                .build();
    }

    private PostFullFeedRow createCologFeedRow(Long postId) {
        return new PostFullFeedRow(
                postId,
                "팀 게시글 제목",
                "https://example.com/team_thumbnail.png",
                Category.TECH,
                PostVisibility.PUBLIC,
                LocalDateTime.of(2026, 8, 13, 12, 0),
                10L,
                "회고",
                2,
                1L,
                "작성자",
                "writer",
                "https://example.com/profile.png",
                BlogType.COLOG,
                COLOG_ID,
                COLOG_SLUG,
                "팀 블로그",
                "https://example.com/colog_logo.png",
                3L
        );
    }

    private Profile createRilogProfile() {
        return Profile.createColog(
                "러로",
                "안녕하세요. 러로입니다. ",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://jinriro.example.com",
                "https://github.com/Wlsflfh",
                "test@test.com"
        );
    }

    private Profile createCologProfile() {
        return Profile.createColog(
                "리로그",
                "세계 최고의 블로그 플랫폼 Rilog. 입니다.",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog",
                "test@test.com"
        );
    }

}
