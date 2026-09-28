package kr.rilog.domain.seo.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@Tag(name = "SEO API")
public interface SitemapApiSpec {

    String SITEMAP_XML_EXAMPLE = """
            <?xml version=\"1.0\" encoding=\"UTF-8\"?>
            <urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">
              <url>
                <loc>https://www.rilog.kr/feeds</loc>
              </url>
              <url>
                <loc>https://www.rilog.kr/@example/posts/1</loc>
                <lastmod>2026-09-21T00:00:00Z</lastmod>
              </url>
            </urlset>
            """;

    @Operation(
            summary = "사이트맵 XML 조회 API",
            description = "검색엔진이 크롤링할 공개 URL 목록을 sitemap 표준 XML로 조회합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "사이트맵 XML 조회 성공",
            content = @Content(
                    mediaType = MediaType.APPLICATION_XML_VALUE,
                    schema = @Schema(type = "string"),
                    examples = @ExampleObject(
                            name = "urlset",
                            summary = "사이트맵",
                            value = SITEMAP_XML_EXAMPLE
                    )
            )
    )
    ResponseEntity<String> readSitemap();

}
