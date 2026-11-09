package kr.rilog.domain.therilog.service;

import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.therilog.repository.TheRilogRepository;
import kr.rilog.domain.therilog.repository.projection.TheRilogSpotlightRow;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult.HeadlineResult;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult.SpotlightResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.post.entity.Post.THE_RILOG_BLOG_SLUG;
import static kr.rilog.domain.post.entity.enums.PostType.ENTERPRISE_SPOTLIGHT;
import static kr.rilog.domain.post.entity.enums.PostType.PERSONAL_SPOTLIGHT;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.heading;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TheRilogQueryServiceTest {

    private static final Slug OFFICIAL_SLUG = Slug.from(THE_RILOG_BLOG_SLUG);
    private static final LocalDateTime PUBLICATION_TIME = LocalDateTime.of(2026, 9, 30, 6, 0);

    private final TheRilogRepository theRilogRepository = mock(TheRilogRepository.class);
    private final TheRilogQueryService theRilogQueryService = new TheRilogQueryService(theRilogRepository);

    @Test
    @DisplayName("메인 대표 날짜는 스포트라이트가 더 최근이어도 뉴스의 발행일을 사용한다.")
    void prefersNewsPublicationDate() {
        // given
        Post news = Post.builder()
                .publishedAt(PUBLICATION_TIME)
                .content(content(heading("news", 2, "뉴스")))
                .build();
        when(theRilogRepository.findLatestPublicNews(eq(OFFICIAL_SLUG), any())).thenReturn(List.of(news));
        givenSpotlight(1L, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME.plusDays(1));

        // when
        TheRilogResult result = theRilogQueryService.readTheRilog();

        // then
        assertThat(result.date()).isEqualTo(PUBLICATION_TIME.toLocalDate());
    }

    @Test
    @DisplayName("뉴스가 없으면 메인 대표 날짜는 최신 스포트라이트의 발행일을 사용한다.")
    void fallsBackToLatestSpotlightPublicationDate() {
        // given
        givenSpotlight(1L, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME);
        givenSpotlight(2L, PERSONAL_SPOTLIGHT, PUBLICATION_TIME.plusDays(1));

        // when
        TheRilogResult result = theRilogQueryService.readTheRilog();

        // then
        assertThat(result.date()).isEqualTo(PUBLICATION_TIME.plusDays(1).toLocalDate());
        assertThat(result.spotlights()).extracting(SpotlightResult::postId).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("뉴스 헤드라인은 빈 제목을 제외하고 나머지 제목의 문서 순서를 유지한다.")
    void excludesBlankHeadlines() {
        // given
        Post news = Post.builder()
                .publishedAt(PUBLICATION_TIME)
                .content(content(heading("first", 1, "첫 소식"),
                        heading("blank", 2, "   "), heading("second", 2, "두 번째 소식"),
                        heading("third", 2, "세 번째 소식"), heading("fourth", 2, "네 번째 소식"),
                        heading("fifth", 2, "다섯 번째 소식"), heading("sixth", 2, "여섯 번째 소식"),
                        heading("seventh", 2, "일곱 번째 소식"), heading("last", 3, "마지막 소식")))
                .build();
        when(theRilogRepository.findLatestPublicNews(eq(OFFICIAL_SLUG), any())).thenReturn(List.of(news));

        // when
        TheRilogResult result = theRilogQueryService.readTheRilog();

        // then
        assertThat(result.news().headlines())
                .extracting(HeadlineResult::title)
                .containsExactly("첫 소식", "두 번째 소식", "세 번째 소식", "네 번째 소식",
                        "다섯 번째 소식", "여섯 번째 소식", "일곱 번째 소식", "마지막 소식");
    }

    @Test
    @DisplayName("아직 발행된 콘텐츠가 없으면 빈 메인 응답을 반환한다.")
    void returnsEmptyMainBeforeFirstPublication() {
        // given
        when(theRilogRepository.findLatestPublicNews(OFFICIAL_SLUG, PageRequest.of(0, 1))).thenReturn(List.of());
        when(theRilogRepository.findLatestPublicSpotlights(OFFICIAL_SLUG, ENTERPRISE_SPOTLIGHT, PageRequest.of(0, 3)))
                .thenReturn(List.of());
        when(theRilogRepository.findLatestPublicSpotlights(OFFICIAL_SLUG, PERSONAL_SPOTLIGHT, PageRequest.of(0, 2)))
                .thenReturn(List.of());

        // when
        TheRilogResult result = theRilogQueryService.readTheRilog();

        // then
        assertThat(result).isEqualTo(new TheRilogResult(THE_RILOG_BLOG_SLUG, null, null, List.of()));
        verify(theRilogRepository).findLatestPublicNews(OFFICIAL_SLUG, PageRequest.of(0, 1));
        verify(theRilogRepository).findLatestPublicSpotlights(OFFICIAL_SLUG, ENTERPRISE_SPOTLIGHT, PageRequest.of(0, 3));
        verify(theRilogRepository).findLatestPublicSpotlights(OFFICIAL_SLUG, PERSONAL_SPOTLIGHT, PageRequest.of(0, 2));
    }

    private void givenSpotlight(Long postId, PostType type, LocalDateTime publishedAt) {
        var spotlight = new TheRilogSpotlightRow(postId, type, "스포트라이트", null, null, publishedAt, null);
        when(theRilogRepository.findLatestPublicSpotlights(eq(OFFICIAL_SLUG), eq(type), any()))
                .thenReturn(List.of(spotlight));
    }
}
