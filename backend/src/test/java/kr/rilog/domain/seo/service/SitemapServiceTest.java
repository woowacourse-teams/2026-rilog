package kr.rilog.domain.seo.service;

import kr.rilog.domain.seo.repository.BlogSeoRepository;
import kr.rilog.domain.seo.repository.PostSeoRepository;
import kr.rilog.domain.seo.repository.projection.PostSitemapRow;
import kr.rilog.domain.seo.config.SitemapProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SitemapServiceTest {

    @Test
    @DisplayName("사이트맵은 표준 XML에 정적 경로와 UTC로 변환한 수정 시각을 담는다.")
    void generateRootSitemapXmlIncludesStaticPathsAndUtcLastmod() {
        // given
        BlogSeoRepository blogSeoRepository = mock(BlogSeoRepository.class);
        PostSeoRepository postSeoRepository = mock(PostSeoRepository.class);
        when(blogSeoRepository.findSitemapBlogs()).thenReturn(List.of());
        when(postSeoRepository.findSitemapPosts()).thenReturn(List.of(
                new PostSitemapRow("time_blog", 1L, LocalDateTime.of(2026, 9, 21, 19, 0))
        ));
        SitemapService sitemapService = new SitemapService(
                blogSeoRepository,
                postSeoRepository,
                new SitemapProperties("https://www.rilog.kr", Duration.ofMinutes(10))
        );

        // when
        String xml = sitemapService.generateRootSitemapXml();

        // then
        assertThat(xml).startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
                .contains("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
                        "<loc>https://www.rilog.kr/feeds</loc>",
                        "<loc>https://www.rilog.kr/about</loc>",
                        "<lastmod>2026-09-21T10:00:00Z</lastmod>");
    }
}
