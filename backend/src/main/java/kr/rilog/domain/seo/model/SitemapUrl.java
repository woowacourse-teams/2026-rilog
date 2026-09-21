package kr.rilog.domain.seo.model;

public record SitemapUrl(String loc, String lastmod) {

    public static SitemapUrl withoutLastmod(String loc) {
        return new SitemapUrl(loc, null);
    }

    public static SitemapUrl withLastmod(String loc, String lastmod) {
        return new SitemapUrl(loc, lastmod);
    }

}
