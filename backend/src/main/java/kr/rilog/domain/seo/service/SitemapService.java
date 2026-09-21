package kr.rilog.domain.seo.service;

import kr.rilog.domain.seo.config.SitemapProperties;
import kr.rilog.domain.seo.model.SitemapUrl;
import kr.rilog.domain.seo.repository.BlogSeoRepository;
import kr.rilog.domain.seo.repository.PostSeoRepository;
import kr.rilog.domain.seo.repository.projection.BlogSitemapRow;
import kr.rilog.domain.seo.repository.projection.PostSitemapRow;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SitemapService {

    private static final String XML_DECLARATION = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
    private static final String SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";
    private static final List<String> STATIC_PATHS = List.of("/feeds", "/about");
    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private final BlogSeoRepository blogSeoRepository;
    private final PostSeoRepository postSeoRepository;
    private final SitemapProperties sitemapProperties;

    public String generateRootSitemapXml() {
        return toUrlsetXml(collectUrls());
    }

    private List<SitemapUrl> collectUrls() {
        List<SitemapUrl> urls = new ArrayList<>();

        urls.addAll(STATIC_PATHS.stream()
                .map(path -> SitemapUrl.withoutLastmod(toAbsoluteUrl(path)))
                .toList());
        urls.addAll(blogSeoRepository.findSitemapBlogs()
                .stream()
                .map(this::toBlogUrl)
                .toList());
        urls.addAll(postSeoRepository.findSitemapPosts()
                .stream()
                .map(this::toPostUrl)
                .toList());

        return urls;
    }

    private SitemapUrl toBlogUrl(BlogSitemapRow row) {
        return SitemapUrl.withoutLastmod(toAbsoluteUrl("/@" + row.slug()));
    }

    private SitemapUrl toPostUrl(PostSitemapRow row) {
        return SitemapUrl.withLastmod(
                toAbsoluteUrl("/@%s/posts/%d".formatted(row.blogSlug(), row.postId())),
                formatLastmod(row.lastModifiedAt())
        );
    }

    private String toAbsoluteUrl(String path) {
        if (path.startsWith("/")) {
            return sitemapProperties.baseUrl() + path;
        }
        return sitemapProperties.baseUrl() + "/" + path;
    }

    private String formatLastmod(LocalDateTime lastModifiedAt) {
        if (lastModifiedAt == null) {
            return null;
        }
        return lastModifiedAt
                .atZone(SERVICE_ZONE)
                .withZoneSameInstant(ZoneOffset.UTC)
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }

    private String toUrlsetXml(List<SitemapUrl> urls) {
        StringBuilder builder = new StringBuilder();
        builder.append(XML_DECLARATION).append('\n');
        builder.append("<urlset xmlns=\"").append(SITEMAP_NAMESPACE).append("\">\n");

        for (SitemapUrl url : urls) {
            appendUrl(builder, url);
        }

        builder.append("</urlset>");
        return builder.toString();
    }

    private void appendUrl(StringBuilder builder, SitemapUrl url) {
        builder.append("  <url>\n");
        builder.append("    <loc>").append(escapeXml(url.loc())).append("</loc>\n");
        if (url.lastmod() != null) {
            builder.append("    <lastmod>").append(escapeXml(url.lastmod())).append("</lastmod>\n");
        }
        builder.append("  </url>\n");
    }

    private String escapeXml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

}
