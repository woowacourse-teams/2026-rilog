package kr.rilog.domain.post.entity;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.support.fixure.BlogFixture.*;
import static kr.rilog.support.fixure.PostContentFixture.*;
import static org.assertj.core.api.Assertions.*;

class TheRilogPostTest {
    private final User writer = createUser(1L);
    private final Blog blog = Blog.builder().id(10L).owner(writer)
            .slug(Slug.from("the_rilog")).blogType(BlogType.RILOG).build();
    private final Chapter spotlights = Chapter.create(blog, "spotlights", 1);
    private final Chapter headlines = Chapter.create(blog, "headlines", 0);

    @Test
    void ordinaryPublishedAndDraftAndBuilderPostsDefaultToStandard() {
        Post post = Post.create(createRilog(writer), writer, detail("일반 글"), null);
        Post draft = Post.draft(new DraftSaveCommand("초안", content(paragraph("본문")).getContent()), writer, createRilog(writer));
        for (Post ordinary : new Post[]{post, draft, Post.builder().build()}) {
            assertThat(ordinary.getPostType()).isEqualTo(PostType.STANDARD);
            assertThat(ordinary.getDescription()).isNull();
            assertThat(ordinary.getSource()).isNull();
        }
    }

    @Test
    void spotlightBelongsToTheRilogAndPreservesSourceOnExistingUpdate() {
        Post post = spotlight("기술 소개", "설명");
        PostSource source = post.getSource();
        post.update(detail("새 제목"), blog);
        assertThat(post.getPostType()).isEqualTo(PostType.ENTERPRISE_SPOTLIGHT);
        assertThat(post.getColog()).isNull();
        assertThat(post.getUser()).isSameAs(writer);
        assertThat(post.getChapter()).isNull();
        assertThat(post.getDescription()).isEqualTo("설명");
        assertThat(post.getSource()).isSameAs(source);
        assertThat(source.getPost()).isSameAs(post);
        assertThat(source.getSourceProfileName()).isEqualTo("기업 A");
    }

    @Test
    void allowsExactLimitsIncludingSpacesAndUnicodeCodePoints() {
        Post post = spotlight("😀".repeat(19) + " ", "가".repeat(99) + " ");
        assertThat(post.getTitle()).isEqualTo("😀".repeat(19) + " ");
        assertThat(post.getDescription()).hasSize(100);
    }

    @Test
    void rejectsTooLongOrBlankSpotlightTitleAndDescription() {
        assertThatThrownBy(() -> spotlight("가".repeat(21), "설명")).isInstanceOf(PostException.class);
        assertThatThrownBy(() -> spotlight(" ", "설명")).isInstanceOf(PostException.class);
        assertThatThrownBy(() -> spotlight("제목", "가".repeat(101))).isInstanceOf(PostException.class);
        assertThatThrownBy(() -> spotlight("제목", " ")).isInstanceOf(PostException.class);
    }

    @Test
    void newsHasNoProfileAndUsesOrdinaryUpdateRules() {
        Post post = news("제목");
        assertThat(post.getDescription()).isNull();
        assertThat(post.getSource()).isNull();
        PostDetail updated = newsDetail("가".repeat(41));
        post.update(updated, blog, headlines);
        assertThat(post.getContent().getContent()).isEqualTo(updated.content());
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    void newsCreationDoesNotDependOnHeadingLevel(int level) {
        PostDetail detail = newsDetail("가".repeat(41), level);
        Post post = Post.createTheRilog(blog, writer, detail, headlines,
                new TheRilogPostMetadata(PostType.DAILY_HEADLINES, null, null, null));
        assertThat(post.getContent().getContent()).isEqualTo(detail.content());
    }

    @Test
    void rejectsWrongBlogOwnerOrForeignChapterOnCreate() {
        TheRilogPostMetadata metadata = metadata("설명");
        assertThatThrownBy(() -> Post.createTheRilog(createRilog(writer), writer, detail("제목"), spotlights, metadata))
                .isInstanceOf(PostException.class);
        assertThatThrownBy(() -> Post.createTheRilog(blog, createUser(2L), detail("제목"), spotlights, metadata))
                .isInstanceOf(BlogException.class);
        Chapter foreign = Chapter.create(otherUserRilog(), "spotlights", 0);
        assertThatThrownBy(() -> Post.createTheRilog(blog, writer, detail("제목"), foreign, metadata))
                .isInstanceOf(PostException.class);
    }

    @Test
    void acceptsValidChapterSelectedByPublishingService() {
        Chapter selected = Chapter.create(blog, "서비스 선택 챕터", 2);
        Post post = Post.createTheRilog(blog, writer, detail("제목"), selected, metadata("설명"));
        assertThat(post.getChapter()).isSameAs(selected);
    }

    @Test
    void spotlightUsesOrdinaryUpdateRulesAndPreservesMetadata() {
        Post post = spotlight("제목", "설명");
        PostSource source = post.getSource();
        Blog colog = createColog(writer, "team");
        Chapter chapter = Chapter.create(colog, "일반 챕터", 0);
        post.update(detail("가".repeat(21)), colog, chapter);
        assertThat(post.getTitle()).isEqualTo("가".repeat(21));
        assertThat(post.getColog()).isSameAs(colog);
        assertThat(post.getChapter()).isSameAs(chapter);
        assertThat(post.getPostType()).isEqualTo(PostType.ENTERPRISE_SPOTLIGHT);
        assertThat(post.getDescription()).isEqualTo("설명");
        assertThat(post.getSource()).isSameAs(source);
    }

    @Test
    void updateStillRejectsOtherUsersRilog() {
        Post post = spotlight("제목", "설명");
        assertThatThrownBy(() -> post.update(detail("변경"), otherUserRilog()))
                .isInstanceOf(BlogException.class);
        assertThat(post.getTitle()).isEqualTo("제목");
    }

    @Test
    void rejectsMissingOrDeletedChapter() {
        assertThatThrownBy(() -> Post.createTheRilog(blog, writer, detail("제목"), null, metadata("설명")))
                .isInstanceOf(PostException.class);
        spotlights.delete();
        assertThatThrownBy(() -> Post.createTheRilog(blog, writer, detail("제목"), spotlights, metadata("설명")))
                .isInstanceOf(PostException.class);
    }

    @Test
    void rejectsMissingBlogCologAndIncompletePostDetails() {
        assertThatThrownBy(() -> Post.createTheRilog(null, writer, detail("제목"), spotlights, metadata("설명")))
                .isInstanceOf(PostException.class);
        assertThatThrownBy(() -> Post.createTheRilog(createColog(writer, "the_rilog"), writer,
                detail("제목"), spotlights, metadata("설명")))
                .isInstanceOf(PostException.class);
        PostDetail[] incompleteDetails = {
                null,
                new PostDetail("제목", content(paragraph("본문")).getContent(), null, PUBLIC, null),
                new PostDetail("제목", content(paragraph("본문")).getContent(), TECH, null, null)
        };
        for (PostDetail incomplete : incompleteDetails) {
            assertThatThrownBy(() -> Post.createTheRilog(blog, writer, incomplete, spotlights, metadata("설명")))
                    .isInstanceOf(PostException.class);
        }
    }

    @Test
    void rejectsMissingProfileAndProfileOnNewsAndStandardMetadata() {
        assertThatThrownBy(() -> new TheRilogPostMetadata(PostType.PERSONAL_SPOTLIGHT, "설명", null, null))
                .isInstanceOf(PostException.class);
        assertThatThrownBy(() -> new TheRilogPostMetadata(PostType.DAILY_HEADLINES, null, "기업", null))
                .isInstanceOf(PostException.class);
        assertThatThrownBy(() -> new TheRilogPostMetadata(PostType.STANDARD, null, null, null))
                .isInstanceOf(PostException.class);
        assertThatCode(() -> new TheRilogPostMetadata(PostType.PERSONAL_SPOTLIGHT, "설명", "닉네임", null))
                .doesNotThrowAnyException();
    }

    private Post spotlight(String title, String description) {
        return Post.createTheRilog(blog, writer, detail(title), spotlights, metadata(description));
    }

    private TheRilogPostMetadata metadata(String description) {
        return new TheRilogPostMetadata(PostType.ENTERPRISE_SPOTLIGHT, description, "기업 A", "https://example.com/logo.png");
    }

    private Post news(String title) {
        return Post.createTheRilog(blog, writer, newsDetail(title), headlines,
                new TheRilogPostMetadata(PostType.DAILY_HEADLINES, null, null, null));
    }

    private PostDetail newsDetail(String title) {
        return newsDetail(title, 2);
    }

    private PostDetail newsDetail(String title, int level) {
        return new PostDetail("오늘의 뉴스", readTree("""
                [{"id":"news-a1","type":"heading","props":{"level":%d},
                  "content":[{"type":"text","text":"%s"}],"children":[]}]
                """.formatted(level, title)), TECH, PUBLIC, null);
    }

    private PostDetail detail(String title) {
        return new PostDetail(title, content(paragraph("본문")).getContent(), TECH, PUBLIC, null);
    }
}
