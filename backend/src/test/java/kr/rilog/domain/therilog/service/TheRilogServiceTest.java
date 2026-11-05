package kr.rilog.domain.therilog.service;

import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.therilog.repository.TheRilogRepository;
import kr.rilog.domain.therilog.repository.projection.TheRilogSpotlightRow;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult.HeadlineResult;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
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
import static org.mockito.Mockito.when;

class TheRilogServiceTest {

    private static final Slug OFFICIAL_SLUG = Slug.from(THE_RILOG_BLOG_SLUG);
    private static final LocalDateTime PUBLICATION_TIME = LocalDateTime.of(2026, 9, 30, 6, 0);

    private final TheRilogRepository theRilogRepository = mock(TheRilogRepository.class);
    private final TheRilogService theRilogService = new TheRilogService(
            theRilogRepository,
            mock(BlogRepository.class),
            mock(UserRepository.class),
            mock(ChapterRepository.class),
            mock(TagAssetsPublisher.class),
            mock(PostViewCountRepository.class),
            Clock.systemUTC()
    );

    @Test
    @DisplayName("메인 대표 날짜는 스포트라이트가 더 최근이어도 뉴스의 발행일을 사용한다.")
    void prefersNewsPublicationDate() {
        Post news = Post.builder()
                .publishedAt(PUBLICATION_TIME)
                .content(content(heading("news", 2, "뉴스")))
                .build();
        when(theRilogRepository.findLatestPublicNews(eq(OFFICIAL_SLUG), any())).thenReturn(List.of(news));
        givenSpotlight(1L, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME.plusDays(1));

        assertThat(theRilogService.readTheRilog().date()).isEqualTo(PUBLICATION_TIME.toLocalDate());
    }

    @Test
    @DisplayName("뉴스가 없으면 메인 대표 날짜는 최신 스포트라이트의 발행일을 사용한다.")
    void fallsBackToLatestSpotlightPublicationDate() {
        givenSpotlight(1L, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME);
        givenSpotlight(2L, PERSONAL_SPOTLIGHT, PUBLICATION_TIME.plusDays(1));

        assertThat(theRilogService.readTheRilog().date()).isEqualTo(PUBLICATION_TIME.plusDays(1).toLocalDate());
    }

    @Test
    @DisplayName("뉴스 헤드라인은 빈 제목을 제외하고 나머지 제목의 문서 순서를 유지한다.")
    void excludesBlankHeadlines() {
        Post news = Post.builder()
                .publishedAt(PUBLICATION_TIME)
                .content(content(heading("first", 1, "첫 소식"),
                        heading("blank", 2, "   "), heading("last", 3, "마지막 소식")))
                .build();
        when(theRilogRepository.findLatestPublicNews(eq(OFFICIAL_SLUG), any())).thenReturn(List.of(news));

        assertThat(theRilogService.readTheRilog().news().headlines())
                .containsExactly(new HeadlineResult("첫 소식"), new HeadlineResult("마지막 소식"));
    }

    private void givenSpotlight(Long postId, PostType type, LocalDateTime publishedAt) {
        var spotlight = new TheRilogSpotlightRow(postId, type, "스포트라이트", null, null, publishedAt, null);
        when(theRilogRepository.findLatestPublicSpotlights(eq(OFFICIAL_SLUG), eq(type), any()))
                .thenReturn(List.of(spotlight));
    }
}
