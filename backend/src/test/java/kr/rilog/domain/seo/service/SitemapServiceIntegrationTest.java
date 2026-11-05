package kr.rilog.domain.seo.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Email;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class SitemapServiceIntegrationTest extends ServiceSupport {

    @Autowired
    private SitemapService sitemapService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private PostRepository postRepository;

    @Test
    @DisplayName("사이트맵은 정적 경로, 활성 블로그, 공개 발행 게시글의 정규 URL을 표준 XML로 반환한다.")
    void generateRootSitemapXmlContainsStaticPathsAndVisibleCanonicalUrls() {
        // given
        User owner = userRepository.save(completedUser(2L, "게시글작성자", "post_author"));
        Blog rilog = blogRepository.save(Blog.createRilog(owner));
        Blog colog = blogRepository.save(Blog.createColog(owner, "post_team", BlogFixture.cologProfile()));
        Post publicRilogPost = postRepository.save(PostFixture.publicPublishedRilogPost(rilog, owner));
        Post publicCologPost = postRepository.save(PostFixture.publicPublishedColog(rilog, colog, owner));
        Post privatePost = postRepository.save(PostFixture.privatePublishedRilogPost(rilog, owner));
        Post draftPost = postRepository.save(PostFixture.publicDraftRilogPost(rilog, owner));
        Post deletedPost = postRepository.save(PostFixture.deletedPublicPublishedCologPost(rilog, colog, owner));
        Blog deletedBlog = blogRepository.save(Blog.createColog(owner, "deleted_team", BlogFixture.cologProfile()));
        Post postInDeletedBlog = postRepository.save(PostFixture.publicPublishedColog(rilog, deletedBlog, owner));
        deletedBlog.delete();
        blogRepository.saveAndFlush(deletedBlog);
        postRepository.flush();

        // when
        String xml = sitemapService.generateRootSitemapXml();

        // then
        assertThat(xml).startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        assertThat(xml).contains("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
        assertThat(xml).contains("<loc>https://www.rilog.kr/feeds</loc>");
        assertThat(xml).contains("<loc>https://www.rilog.kr/about</loc>");
        assertThat(xml).contains("<loc>https://www.rilog.kr/@%s</loc>".formatted(rilog.getSlug()));
        assertThat(xml).contains("<loc>https://www.rilog.kr/@%s</loc>".formatted(colog.getSlug()));
        assertThat(xml).doesNotContain("<loc>https://www.rilog.kr/@%s</loc>".formatted(deletedBlog.getSlug()));

        assertThat(xml).contains("<loc>https://www.rilog.kr/@%s/posts/%d</loc>".formatted(rilog.getSlug(), publicRilogPost.getId()));
        assertThat(xml).contains("<loc>https://www.rilog.kr/@%s/posts/%d</loc>".formatted(colog.getSlug(), publicCologPost.getId()));
        assertThat(xml).doesNotContain("/posts/%d".formatted(privatePost.getId()));
        assertThat(xml).doesNotContain("/posts/%d".formatted(draftPost.getId()));
        assertThat(xml).doesNotContain("/posts/%d".formatted(deletedPost.getId()));
        assertThat(xml).doesNotContain("/posts/%d".formatted(postInDeletedBlog.getId()));
        assertThat(xml).containsPattern("<lastmod>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z</lastmod>");
    }

    private User completedUser(Long githubId, String nickname, String slug) {
        return User.builder()
                .githubId(githubId)
                .nickname(Nickname.from(nickname))
                .slug(Slug.from(slug))
                .introduction("기록하는 개발자입니다.")
                .profileImageUrl("https://example.com/profile.png")
                .githubUrl("https://github.com/%s".formatted(slug))
                .email(Email.from("%s@example.com".formatted(slug)))
                .build();
    }
}
