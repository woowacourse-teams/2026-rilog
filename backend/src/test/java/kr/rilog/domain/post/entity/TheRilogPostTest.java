package kr.rilog.domain.post.entity;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.PostSource;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_THE_RILOG_METADATA;
import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_THE_RILOG_POST;
import static kr.rilog.support.fixure.BlogFixture.*;
import static kr.rilog.support.fixure.PostContentFixture.*;
import static kr.rilog.support.fixure.PostFixture.*;
import static org.assertj.core.api.Assertions.*;

class TheRilogPostTest {

    private static final String THE_RILOG_SLUG = "the_rilog";
    private static final String SPOTLIGHT_SOURCE_NAME = "기업 A";
    private static final String SPOTLIGHT_SOURCE_IMAGE = "https://example.com/logo.png";

    private final User writer = createUser(1L);
    private final Blog theRilog = theRilogOwnedBy(writer);
    private final Chapter spotlights = Chapter.create(theRilog, "spotlights", 1);
    private final Chapter headlines = Chapter.create(theRilog, "headlines", 0);

    @Test
    @DisplayName("일반 발행 게시글의 유형은 STANDARD로 생성된다.")
    void standardPublishedPostHasStandardType() {
        Post post = Post.create(createRilog(writer), writer, postDetail("일반 글"), null);

        assertThat(post.getPostType()).isEqualTo(PostType.STANDARD);
    }

    @Test
    @DisplayName("임시저장 게시글의 유형은 STANDARD로 생성된다.")
    void draftPostHasStandardType() {
        Post draft = Post.draft(new DraftSaveCommand("초안", content(paragraph("본문")).getContent()), writer, createRilog(writer));

        assertThat(draft.getPostType()).isEqualTo(PostType.STANDARD);
    }

    @Test
    @DisplayName("유형을 지정하지 않은 공개 게시글은 STANDARD로 생성된다.")
    void publishedPostDefaultsToStandardType() {
        Post post = publicPublishedRilogPost(createRilog(writer), writer);

        assertThat(post.getPostType()).isEqualTo(PostType.STANDARD);
    }

    @Test
    @DisplayName("일반 게시글은 더 리로그 설명을 가지지 않는다.")
    void standardPostHasNoTheRilogDescription() {
        Post post = Post.create(createRilog(writer), writer, postDetail("일반 글"), null);

        assertThat(post.getDescription()).isNull();
    }

    @Test
    @DisplayName("임시저장 게시글은 더 리로그 설명을 가지지 않는다.")
    void draftPostHasNoTheRilogDescription() {
        Post draft = Post.draft(new DraftSaveCommand("초안", content(paragraph("본문")).getContent()), writer, createRilog(writer));

        assertThat(draft.getDescription()).isNull();
    }

    @Test
    @DisplayName("일반 게시글은 출처 정보를 가지지 않는다.")
    void standardPostHasNoSource() {
        Post post = Post.create(createRilog(writer), writer, postDetail("일반 글"), null);

        assertThat(post.getSource()).isNull();
    }

    @Test
    @DisplayName("임시저장 게시글은 출처 정보를 가지지 않는다.")
    void draftPostHasNoSource() {
        Post draft = Post.draft(new DraftSaveCommand("초안", content(paragraph("본문")).getContent()), writer, createRilog(writer));

        assertThat(draft.getSource()).isNull();
    }

    @Test
    @DisplayName("스포트라이트 게시글은 요청한 더 리로그 유형으로 생성된다.")
    void spotlightPostHasRequestedTheRilogType() {
        Post post = spotlight("기술 소개", "설명");

        assertThat(post.getPostType()).isEqualTo(PostType.ENTERPRISE_SPOTLIGHT);
    }

    @Test
    @DisplayName("스포트라이트 게시글은 개인 블로그 글로 생성된다.")
    void spotlightPostBelongsToTheRilogAsRilogPost() {
        Post post = spotlight("기술 소개", "설명");

        assertThat(post.getColog()).isNull();
    }

    @Test
    @DisplayName("스포트라이트 게시글은 더 리로그 설명을 보관한다.")
    void spotlightPostKeepsDescription() {
        Post post = spotlight("기술 소개", "설명");

        assertThat(post.getDescription()).isEqualTo("설명");
    }

    @Test
    @DisplayName("스포트라이트 게시글은 출처 정보를 값으로 보관한다.")
    void spotlightPostKeepsSourceAsValue() {
        Post post = spotlight("기술 소개", "설명");

        assertThat(post.getSource()).isEqualTo(PostSource.create(SPOTLIGHT_SOURCE_NAME, SPOTLIGHT_SOURCE_IMAGE));
    }

    @Test
    @DisplayName("스포트라이트 제목은 공백을 포함해 최대 20자까지 허용된다.")
    void spotlightTitleAllowsTwentyCodePointsIncludingSpaces() {
        String title = "😀".repeat(19) + " ";

        Post post = spotlight(title, "설명");

        assertThat(post.getTitle()).isEqualTo(title);
    }

    @Test
    @DisplayName("스포트라이트 설명은 공백을 포함해 최대 100자까지 허용된다.")
    void spotlightDescriptionAllowsOneHundredCodePointsIncludingSpaces() {
        String description = "가".repeat(99) + " ";

        Post post = spotlight("제목", description);

        assertThat(post.getDescription()).isEqualTo(description);
    }

    @Test
    @DisplayName("스포트라이트 제목이 최대 길이를 초과하면 생성할 수 없다.")
    void spotlightTitleLongerThanTwentyCodePointsIsRejected() {
        assertThatThrownBy(() -> spotlight("가".repeat(21), "설명"))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("스포트라이트 제목이 공백이면 생성할 수 없다.")
    void blankSpotlightTitleIsRejected() {
        assertThatThrownBy(() -> spotlight(" ", "설명"))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("스포트라이트 설명이 최대 길이를 초과하면 메타데이터를 만들 수 없다.")
    void spotlightDescriptionLongerThanOneHundredCodePointsIsRejected() {
        assertThatThrownBy(() -> spotlightMetadata("가".repeat(101)))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_METADATA.getMessage());
    }

    @Test
    @DisplayName("스포트라이트 설명이 공백이면 메타데이터를 만들 수 없다.")
    void blankSpotlightDescriptionIsRejected() {
        assertThatThrownBy(() -> spotlightMetadata(" "))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_METADATA.getMessage());
    }

    @Test
    @DisplayName("뉴스 게시글은 더 리로그 설명을 가지지 않는다.")
    void newsPostHasNoDescription() {
        Post post = news("제목");

        assertThat(post.getDescription()).isNull();
    }

    @Test
    @DisplayName("뉴스 게시글은 출처 정보를 가지지 않는다.")
    void newsPostHasNoSource() {
        Post post = news("제목");

        assertThat(post.getSource()).isNull();
    }

    @Test
    @DisplayName("뉴스 게시글은 본문의 제목 길이를 도메인에서 검증하지 않는다.")
    void newsCreationDoesNotValidateHeadlineTextLengthInDomain() {
        PostDetail detail = newsDetail("가".repeat(41), 2);

        Post post = Post.createTheRilog(theRilog, writer, detail, headlines, newsMetadata());

        assertThat(post.getContent()).isEqualTo(PostContent.from(detail.content()));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    @DisplayName("뉴스 게시글은 본문의 heading 레벨에 의존하지 않는다.")
    void newsCreationDoesNotDependOnHeadingLevelInDomain(int headingLevel) {
        PostDetail detail = newsDetail("뉴스 제목", headingLevel);

        Post post = Post.createTheRilog(theRilog, writer, detail, headlines, newsMetadata());

        assertThat(post.getContent()).isEqualTo(PostContent.from(detail.content()));
    }

    @Test
    @DisplayName("뉴스 게시글 수정은 본문의 제목 길이를 도메인에서 검증하지 않는다.")
    void newsUpdateDoesNotValidateHeadlineTextLengthInDomain() {
        Post post = news("제목");
        PostDetail updated = newsDetail("가".repeat(41), 2);

        post.update(updated, theRilog, headlines);

        assertThat(post.getContent()).isEqualTo(PostContent.from(updated.content()));
    }

    @Test
    @DisplayName("더 리로그 글은 the_rilog 개인 블로그에서만 생성된다.")
    void theRilogPostRequiresTheRilogBlogSlug() {
        assertThatThrownBy(() -> Post.createTheRilog(createRilog(writer), writer, postDetail("제목"), spotlights, spotlightMetadata("설명")))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("더 리로그 글은 블로그가 없으면 생성할 수 없다.")
    void theRilogPostRequiresBlog() {
        assertThatThrownBy(() -> Post.createTheRilog(null, writer, postDetail("제목"), spotlights, spotlightMetadata("설명")))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("더 리로그 글은 Colog에 생성할 수 없다.")
    void theRilogPostRejectsColog() {
        assertThatThrownBy(() -> Post.createTheRilog(createColog(writer, THE_RILOG_SLUG), writer,
                postDetail("제목"), spotlights, spotlightMetadata("설명")))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("더 리로그 글은 블로그 소유자만 생성할 수 있다.")
    void theRilogPostRequiresBlogOwner() {
        assertThatThrownBy(() -> Post.createTheRilog(theRilog, createUser(2L), postDetail("제목"), spotlights, spotlightMetadata("설명")))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("더 리로그 글은 다른 블로그의 챕터에 생성할 수 없다.")
    void theRilogPostRejectsChapterFromOtherBlog() {
        Chapter foreignChapter = Chapter.create(otherUserRilog(), "spotlights", 0);

        assertThatThrownBy(() -> Post.createTheRilog(theRilog, writer, postDetail("제목"), foreignChapter, spotlightMetadata("설명")))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("더 리로그 글은 삭제된 챕터에 생성할 수 없다.")
    void theRilogPostRejectsDeletedChapter() {
        spotlights.delete();

        assertThatThrownBy(() -> Post.createTheRilog(theRilog, writer, postDetail("제목"), spotlights, spotlightMetadata("설명")))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("더 리로그 글은 챕터가 없으면 생성할 수 없다.")
    void theRilogPostRequiresChapter() {
        assertThatThrownBy(() -> Post.createTheRilog(theRilog, writer, postDetail("제목"), null, spotlightMetadata("설명")))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("더 리로그 글의 도메인 생성은 챕터 이름을 검증하지 않는다.")
    void theRilogDomainCreationDoesNotValidateChapterName() {
        Chapter selectedByService = Chapter.create(theRilog, "서비스 선택 챕터", 2);

        Post post = Post.createTheRilog(theRilog, writer, postDetail("제목"), selectedByService, spotlightMetadata("설명"));

        assertThat(post.getChapter()).isSameAs(selectedByService);
    }

    @Test
    @DisplayName("더 리로그 글은 상세 정보가 없으면 생성할 수 없다.")
    void theRilogPostRequiresDetail() {
        assertThatThrownBy(() -> Post.createTheRilog(theRilog, writer, null, spotlights, spotlightMetadata("설명")))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("더 리로그 글은 카테고리가 없으면 생성할 수 없다.")
    void theRilogPostRequiresCategory() {
        PostDetail detail = new PostDetail("제목", content(paragraph("본문")).getContent(), null, PUBLIC, null);

        assertThatThrownBy(() -> Post.createTheRilog(theRilog, writer, detail, spotlights, spotlightMetadata("설명")))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("더 리로그 글은 공개 범위가 없으면 생성할 수 없다.")
    void theRilogPostRequiresVisibility() {
        PostDetail detail = new PostDetail("제목", content(paragraph("본문")).getContent(), TECH, null, null);

        assertThatThrownBy(() -> Post.createTheRilog(theRilog, writer, detail, spotlights, spotlightMetadata("설명")))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_POST.getMessage());
    }

    @Test
    @DisplayName("스포트라이트 메타데이터는 출처 이름이 필요하다.")
    void spotlightMetadataRequiresSourceName() {
        assertThatThrownBy(() -> new TheRilogPostMetadata(PostType.PERSONAL_SPOTLIGHT, "설명", null, null))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_METADATA.getMessage());
    }

    @Test
    @DisplayName("스포트라이트 메타데이터는 공백 출처 이름을 허용하지 않는다.")
    void spotlightMetadataRejectsBlankSourceName() {
        assertThatThrownBy(() -> new TheRilogPostMetadata(PostType.PERSONAL_SPOTLIGHT, "설명", " ", null))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_METADATA.getMessage());
    }

    @Test
    @DisplayName("스포트라이트 메타데이터는 출처 이름이 최대 길이를 초과하면 만들 수 없다.")
    void spotlightMetadataRejectsTooLongSourceName() {
        assertThatThrownBy(() -> new TheRilogPostMetadata(PostType.PERSONAL_SPOTLIGHT, "설명", "가".repeat(256), null))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_METADATA.getMessage());
    }

    @Test
    @DisplayName("스포트라이트 메타데이터는 출처 이미지를 생략할 수 있다.")
    void spotlightMetadataAllowsMissingSourceImage() {
        assertThatCode(() -> new TheRilogPostMetadata(PostType.PERSONAL_SPOTLIGHT, "설명", "닉네임", null))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("스포트라이트 메타데이터는 출처 이미지가 최대 길이를 초과하면 만들 수 없다.")
    void spotlightMetadataRejectsTooLongSourceImage() {
        assertThatThrownBy(() -> new TheRilogPostMetadata(PostType.PERSONAL_SPOTLIGHT, "설명", "닉네임", "a".repeat(513)))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_METADATA.getMessage());
    }

    @Test
    @DisplayName("뉴스 메타데이터는 출처 이름을 가질 수 없다.")
    void newsMetadataRejectsSourceName() {
        assertThatThrownBy(() -> new TheRilogPostMetadata(PostType.DAILY_HEADLINES, null, "기업", null))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_METADATA.getMessage());
    }

    @Test
    @DisplayName("일반 글 유형으로 더 리로그 메타데이터를 만들 수 없다.")
    void standardTypeCannotCreateTheRilogMetadata() {
        assertThatThrownBy(() -> new TheRilogPostMetadata(PostType.STANDARD, null, null, null))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_THE_RILOG_METADATA.getMessage());
    }

    @Test
    @DisplayName("스포트라이트 글을 수정하면 일반 게시글 수정 규칙으로 대상 블로그와 챕터가 바뀐다.")
    void spotlightUpdateUsesOrdinaryPostTargetBlogAndChapterRules() {
        Post post = spotlight("제목", "설명");
        Blog colog = createColog(writer, "team");
        Chapter chapter = Chapter.create(colog, "일반 챕터", 0);

        post.update(postDetail("수정된 제목"), colog, chapter);

        assertThat(post.getColog()).isSameAs(colog);
        assertThat(post.getChapter()).isSameAs(chapter);
    }

    @Test
    @DisplayName("스포트라이트 글을 수정하면 일반 게시글 제목 규칙이 적용된다.")
    void spotlightUpdateUsesOrdinaryPostTitleRule() {
        Post post = spotlight("제목", "설명");

        post.update(postDetail("가".repeat(21)), theRilog, spotlights);

        assertThat(post.getTitle()).isEqualTo("가".repeat(21));
    }

    @Test
    @DisplayName("스포트라이트 글을 팀 블로그로 옮겨도 게시글 유형은 유지된다.")
    void spotlightUpdateToCologPreservesPostType() {
        Post post = spotlight("제목", "설명");
        Blog colog = createColog(writer, "team");
        Chapter chapter = Chapter.create(colog, "일반 챕터", 0);

        post.update(postDetail("수정된 제목"), colog, chapter);

        assertThat(post.getPostType()).isEqualTo(PostType.ENTERPRISE_SPOTLIGHT);
    }

    @Test
    @DisplayName("스포트라이트 글을 수정해도 더 리로그 설명은 유지된다.")
    void spotlightUpdatePreservesDescription() {
        Post post = spotlight("제목", "설명");
        Blog colog = createColog(writer, "team");
        Chapter chapter = Chapter.create(colog, "일반 챕터", 0);

        post.update(postDetail("수정된 제목"), colog, chapter);

        assertThat(post.getDescription()).isEqualTo("설명");
    }

    @Test
    @DisplayName("스포트라이트 글을 수정해도 출처 정보는 유지된다.")
    void spotlightUpdatePreservesSource() {
        Post post = spotlight("제목", "설명");
        Blog colog = createColog(writer, "team");
        Chapter chapter = Chapter.create(colog, "일반 챕터", 0);

        post.update(postDetail("수정된 제목"), colog, chapter);

        assertThat(post.getSource()).isEqualTo(PostSource.create(SPOTLIGHT_SOURCE_NAME, SPOTLIGHT_SOURCE_IMAGE));
    }

    @Test
    @DisplayName("스포트라이트 글도 다른 사용자의 개인 블로그로 수정할 수 없다.")
    void spotlightUpdateRejectsOtherUsersRilog() {
        Post post = spotlight("제목", "설명");

        assertThatThrownBy(() -> post.update(postDetail("변경"), otherUserRilog()))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());
    }

    private Post spotlight(String title, String description) {
        return Post.createTheRilog(theRilog, writer, postDetail(title), spotlights, spotlightMetadata(description));
    }

    private TheRilogPostMetadata spotlightMetadata(String description) {
        return new TheRilogPostMetadata(PostType.ENTERPRISE_SPOTLIGHT, description, SPOTLIGHT_SOURCE_NAME, SPOTLIGHT_SOURCE_IMAGE);
    }

    private Post news(String title) {
        return Post.createTheRilog(theRilog, writer, newsDetail(title, 2), headlines, newsMetadata());
    }

    private TheRilogPostMetadata newsMetadata() {
        return new TheRilogPostMetadata(PostType.DAILY_HEADLINES, null, null, null);
    }

    private PostDetail newsDetail(String title, int level) {
        return new PostDetail("오늘의 뉴스", readTree("""
                [{"id":"news-a1","type":"heading","props":{"level":%d},
                  "content":[{"type":"text","text":"%s"}],"children":[]}]
                """.formatted(level, title)), TECH, PUBLIC, null);
    }

    private PostDetail postDetail(String title) {
        return new PostDetail(title, content(paragraph("본문")).getContent(), TECH, PUBLIC, null);
    }

    private Blog theRilogOwnedBy(User owner) {
        return Blog.builder()
                .id(10L)
                .owner(owner)
                .slug(Slug.from(THE_RILOG_SLUG))
                .blogType(BlogType.RILOG)
                .build();
    }
}
