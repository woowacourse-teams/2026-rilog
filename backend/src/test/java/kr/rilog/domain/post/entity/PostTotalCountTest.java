package kr.rilog.domain.post.entity;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.user.entity.User;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.TheRilogPostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;

import java.time.LocalDateTime;
import java.util.stream.Stream;

import static kr.rilog.support.fixure.BlogFixture.createRilog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;

class PostTotalCountTest {

    @ParameterizedTest(name = "{0}")
    @MethodSource("countMemberships")
    @DisplayName("삭제되지 않은 공개 발행 일반 게시글만 전체 글 수에 포함한다.")
    void includesOnlyPublicPublishedStandardPosts(String description, Post post, boolean included) {
        assertThat(post.isIncludedInTotalCount()).isEqualTo(included);
    }

    private static Stream<Arguments> countMemberships() {
        User writer = createUser(1L);
        Blog rilog = createRilog(writer);
        Blog officialBlog = Blog.builder()
                .id(10L)
                .owner(writer)
                .slug(Slug.from(Post.THE_RILOG_BLOG_SLUG))
                .blogType(BlogType.RILOG)
                .build();
        Chapter headlines = Chapter.create(officialBlog, "headlines", 0);
        Chapter spotlights = Chapter.create(officialBlog, "spotlights", 1);
        LocalDateTime publishedAt = LocalDateTime.of(2026, 11, 1, 12, 0);
        return Stream.of(
                Arguments.of("공개 발행 일반 글", PostFixture.publicPublishedRilogPost(rilog, writer), true),
                Arguments.of("비공개 글", PostFixture.privatePublishedRilogPost(rilog, writer), false),
                Arguments.of("공개 초안", PostFixture.publicDraftRilogPost(rilog, writer), false),
                Arguments.of("삭제된 글", PostFixture.deletedPublicPublishedRilogPost(rilog, writer), false),
                Arguments.of("더 리로그 뉴스", TheRilogPostFixture.publishedNews(
                        headlines, publishedAt, content(paragraph("소식"))), false),
                Arguments.of("더 리로그 스포트라이트", TheRilogPostFixture.publishedSpotlight(
                        spotlights, PostType.ENTERPRISE_SPOTLIGHT, publishedAt), false)
        );
    }
}
