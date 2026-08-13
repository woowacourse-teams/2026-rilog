package kr.rilog.domain.post.service;

import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    private static final int PAGE = 1;
    private static final int SIZE = 2;

    @Mock
    private PostFeedQueryRepository postFeedQueryRepository;

    private FeedService feedService;

    @BeforeEach
    void setUp() {
        feedService = new FeedService(postFeedQueryRepository);
    }

    @Test
    @DisplayName("전체 피드는 발행된 공개 게시글을 요청한 페이지 조건으로 조회한다")
    void getFullFeedPostListRequestsPublishedPublicPosts() {
        // given
        PageRequest pageable = PageRequest.of(PAGE, SIZE);
        when(postFeedQueryRepository.findFullFeed(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        )).thenReturn(new SliceImpl<>(List.of(), pageable, false));

        // when
        feedService.getFullFeedPostList(PAGE, SIZE);

        // then
        verify(postFeedQueryRepository).findFullFeed(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        );
    }

    @Test
    @DisplayName("전체 피드 조회 결과에 게시글과 페이지 정보가 포함된다")
    void getFullFeedPostListReturnsPostsAndPagination() {
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
        FullFeedPostResponse response = feedService.getFullFeedPostList(PAGE, SIZE);

        // then
        assertThat(response.posts())
                .extracting(FullFeedPostResponse.PostItemResponse::postId)
                .containsExactly(2L, 1L);
        assertThat(response.page()).isEqualTo(PAGE);
        assertThat(response.size()).isEqualTo(SIZE);
        assertThat(response.numberOfElements()).isEqualTo(rows.size());
        assertThat(response.hasNext()).isTrue();
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

}
