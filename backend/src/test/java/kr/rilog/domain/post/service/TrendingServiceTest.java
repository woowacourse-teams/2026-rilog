package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.repository.TrendingPostQueryRepository;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import kr.rilog.domain.post.service.dto.command.FullFeedSearchCommand;
import kr.rilog.domain.post.service.dto.result.FullFeedPostResult;
import kr.rilog.domain.post.trending.TrendingProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TrendingServiceTest {

    @Test
    @DisplayName("트렌딩 조회는 게시글 시간대에서 두 달 범위를 계산하고 Slice와 댓글 수를 매핑한다.")
    void readTrendingPostsUsesTwoCalendarMonthsAndMapsSlice() {
        // given
        TrendingPostQueryRepository repository = mock(TrendingPostQueryRepository.class);
        Clock clock = Clock.fixed(Instant.parse("2026-04-29T15:00:00Z"), ZoneOffset.UTC);
        TrendingProperties properties = new TrendingProperties(7, ZoneId.of("Asia/Seoul"));
        TrendingService service = new TrendingService(repository, properties, clock);
        FullFeedSearchCommand command = new FullFeedSearchCommand(Category.TECH, BlogType.RILOG, 1, 2);
        PageRequest pageable = PageRequest.of(1, 2);
        LocalDateTime from = LocalDateTime.of(2026, 2, 28, 0, 0);
        LocalDateTime until = LocalDateTime.of(2026, 4, 30, 0, 0);
        PostFullFeedRow row = new PostFullFeedRow(
                1L, "트렌딩 글", null, Category.TECH, PUBLIC, from,
                null, null, null,
                2L, "작성자", "writer", null,
                BlogType.RILOG, 3L, "writer", "작성자", null, 5L
        );
        when(repository.findTrendingPosts(PUBLISHED, PUBLIC, Category.TECH, BlogType.RILOG, from, until, pageable))
                .thenReturn(new SliceImpl<>(List.of(row), pageable, true));

        // when
        FullFeedPostResult result = service.readTrendingPostList(command);

        // then
        assertThat(result.posts()).singleElement().satisfies(post -> {
            assertThat(post.postId()).isEqualTo(row.postId());
            assertThat(post.totalCommentsCount()).isEqualTo(5L);
        });
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.size()).isEqualTo(2);
        assertThat(result.numberOfElements()).isEqualTo(1);
        assertThat(result.hasNext()).isTrue();
    }
}
