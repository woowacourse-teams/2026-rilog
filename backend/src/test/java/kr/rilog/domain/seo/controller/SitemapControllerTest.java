package kr.rilog.domain.seo.controller;

import kr.rilog.domain.seo.config.SitemapProperties;
import kr.rilog.domain.seo.service.SitemapService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Duration;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SitemapControllerTest {

    @Test
    @DisplayName("사이트맵은 인증 없이 ApiResponse 래퍼가 아닌 XML을 반환한다.")
    void readSitemapReturnsPlainXmlWithoutAuthentication() throws Exception {
        // given
        SitemapService sitemapService = mock(SitemapService.class);
        SitemapProperties properties = new SitemapProperties("https://www.rilog.kr", Duration.ofMinutes(10));
        String xml = """
                <?xml version=\"1.0\" encoding=\"UTF-8\"?>
                <urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">
                  <url>
                    <loc>https://www.rilog.kr/feeds</loc>
                  </url>
                </urlset>
                """;
        when(sitemapService.generateRootSitemapXml()).thenReturn(xml);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new SitemapController(sitemapService, properties)).build();

        // when - then
        mockMvc.perform(get("/v1/sitemap.xml"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/xml;charset=UTF-8"))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("max-age=600")))
                .andExpect(content().string(xml));

        verify(sitemapService).generateRootSitemapXml();
    }

}
