package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.PublicBlogFeedPostResponse;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long COLOG_ID = 1L;
    private static final Long RILOG_ID = 2L;
    private static final String COLOG_SLUG = "team-colog";
    private static final String RILOG_SLUG = "writer";
    private static final int PAGE = 1;
    private static final int SIZE = 2;

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
    @DisplayName("전체 피드는 발행된 공개 게시글을 요청한 페이지 조건으로 조회한다")
    void readFullFeedPostListRequestsPublishedPublicPosts() {
        // given
        PageRequest pageable = PageRequest.of(PAGE, SIZE);
        when(postFeedQueryRepository.findFullFeed(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        )).thenReturn(new SliceImpl<>(List.of(), pageable, false));

        // when
        feedService.readFullFeedPostList(PAGE, SIZE);

        // then
        verify(postFeedQueryRepository).findFullFeed(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        );
    }

    @Test
    @DisplayName("전체 피드 조회 결과에 게시글과 페이지 정보가 포함된다")
    void readFullFeedPostListReturnsPostsAndPagination() {
        // given
        PageRequest pageable = PageRequest.of(PAGE, SIZE);
        List<PostFullFeedRow> rows = List.of(
                createFeedRow(2L),
                createFeedRow(1L)
        );
        when(postFeedQueryRepository.findFullFeed(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        )).thenReturn(new SliceImpl<>(rows, pageable, true));

        // when
        FullFeedPostResponse response = feedService.readFullFeedPostList(PAGE, SIZE);

        // then
        assertThat(response.posts())
                .extracting(FullFeedPostResponse.PostItemResponse::postId)
                .containsExactly(2L, 1L);
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
        PageRequest pageable = PageRequest.of(PAGE, SIZE);
        List<PostFullFeedRow> rows = List.of(
                createFeedRow(2L),
                createCologFeedRow(1L)
        );
        when(blogRepository.findBySlugAndDeletedAtIsNull(RILOG_SLUG)).thenReturn(Optional.of(rilog));
        when(postFeedQueryRepository.findPublicRilogPosts(
                RILOG_ID,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        )).thenReturn(new SliceImpl<>(rows, pageable, true));

        // when
        PublicBlogFeedPostResponse response = feedService.readPublicBlogPosts(RILOG_SLUG, PAGE, SIZE);

        // then
        assertThat(response.type()).isEqualTo("RILOG");
        assertThat(response.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(2L, 1L);
        assertThat(response.posts().get(0).colog()).isNull();
        assertThat(response.posts().get(1).colog())
                .extracting(PublicBlogFeedPostResponse.CologResponse::slug)
                .isEqualTo(COLOG_SLUG);
        assertThat(response.page()).isEqualTo(PAGE);
        assertThat(response.hasNext()).isTrue();
        verify(postFeedQueryRepository).findPublicRilogPosts(
                RILOG_ID,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        );
    }

    @Test
    @DisplayName("공개 블로그 게시글 목록은 COLOG slug로 팀의 공개 게시글을 조회한다")
    void readPublicBlogPostsRequestsPublishedPublicPostsOfColog() {
        // given
        Blog colog = createColog();
        PageRequest pageable = PageRequest.of(PAGE, SIZE);
        List<PostFullFeedRow> rows = List.of(
                createCologFeedRow(2L),
                createCologFeedRow(1L)
        );
        when(blogRepository.findBySlugAndDeletedAtIsNull(COLOG_SLUG)).thenReturn(Optional.of(colog));
        when(postFeedQueryRepository.findPublicCologPosts(
                COLOG_ID,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        )).thenReturn(new SliceImpl<>(rows, pageable, false));

        // when
        PublicBlogFeedPostResponse response = feedService.readPublicBlogPosts(COLOG_SLUG, PAGE, SIZE);

        // then
        assertThat(response.type()).isEqualTo("COLOG");
        assertThat(response.posts())
                .extracting(PublicBlogFeedPostResponse.PostItemResponse::postId)
                .containsExactly(2L, 1L);
        assertThat(response.size()).isEqualTo(SIZE);
        assertThat(response.hasNext()).isFalse();
        verify(postFeedQueryRepository).findPublicCologPosts(
                COLOG_ID,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        );
    }

    @Test
    @DisplayName("존재하지 않거나 삭제된 공개 블로그의 게시글 목록을 조회하면 게시글을 조회하지 않고 예외가 발생한다")
    void readPublicBlogPostsThrowsExceptionWhenBlogDoesNotExist() {
        // given
        when(blogRepository.findBySlugAndDeletedAtIsNull("unknown")).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> feedService.readPublicBlogPosts("unknown", PAGE, SIZE))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_NOT_FOUND);
        verifyNoInteractions(postFeedQueryRepository);
    }

    private PostFullFeedRow createFeedRow(Long postId) {
        return new PostFullFeedRow(
                postId,
                "게시글 제목",
                "https://example.com/thumbnail.png",
                Category.TECH,
                PostVisibility.PUBLIC,
                LocalDateTime.of(2026, 8, 13, 12, 0),
                1L,
                "작성자",
                "writer",
                "https://example.com/profile.png",
                null,
                null,
                null,
                null
        );
    }

    private Blog createColog() {
        return Blog.builder()
                .id(COLOG_ID)
                .slug(COLOG_SLUG)
                .blogType(BlogType.COLOG)
                .build();
    }

    private Blog createRilog() {
        return Blog.builder()
                .id(RILOG_ID)
                .slug(RILOG_SLUG)
                .blogType(BlogType.RILOG)
                .build();
    }

    private PostFullFeedRow createCologFeedRow(Long postId) {
        return new PostFullFeedRow(
                postId,
                "팀 게시글 제목",
                "https://example.com/team-thumbnail.png",
                Category.TECH,
                PostVisibility.PUBLIC,
                LocalDateTime.of(2026, 8, 13, 12, 0),
                1L,
                "작성자",
                "writer",
                "https://example.com/profile.png",
                COLOG_ID,
                "팀 블로그",
                COLOG_SLUG,
                "https://example.com/colog-logo.png"
        );
    }

}
