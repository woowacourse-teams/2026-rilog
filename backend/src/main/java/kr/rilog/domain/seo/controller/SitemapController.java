package kr.rilog.domain.seo.controller;

import kr.rilog.domain.seo.config.SitemapProperties;
import kr.rilog.domain.seo.controller.apispec.SitemapApiSpec;
import kr.rilog.domain.seo.service.SitemapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequiredArgsConstructor
public class SitemapController implements SitemapApiSpec {

    private static final MediaType SITEMAP_XML = new MediaType("application", "xml", StandardCharsets.UTF_8);

    private final SitemapService sitemapService;
    private final SitemapProperties sitemapProperties;

    @Override
    @GetMapping(value = "/v1/sitemap.xml", produces = "application/xml; charset=UTF-8")
    public ResponseEntity<String> readSitemap() {
        return xmlResponse(sitemapService.generateRootSitemapXml());
    }

    private ResponseEntity<String> xmlResponse(String xml) {
        return ResponseEntity.ok()
                .contentType(SITEMAP_XML)
                .cacheControl(CacheControl.maxAge(sitemapProperties.cacheMaxAge()).cachePublic())
                .body(xml);
    }

}
