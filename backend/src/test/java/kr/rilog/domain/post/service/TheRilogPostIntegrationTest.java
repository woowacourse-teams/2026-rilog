package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.PostSource;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.post.service.dto.command.TheRilogPostPublishCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.post.service.dto.result.PostUpdateResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.domain.post.exception.PostErrorInformation.NOT_POST_AUTHOR;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TheRilogPostIntegrationTest extends ServiceSupport {

    private static final String THE_RILOG_SLUG = "the_rilog";
    private static final String SPOTLIGHT_DESCRIPTION = "핵심 요약";
    private static final String SOURCE_PROFILE_NAME = "출처 이름";
    private static final String SOURCE_PROFILE_IMAGE = "https://example.com/profile.png";

    @Autowired
    private PostService postService;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private PostViewCountRepository postViewCountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private User writer;
    private Blog theRilog;
    private Chapter headlines;
    private Chapter spotlights;

    @BeforeEach
    void setUpTheRilogBlog() {
        writer = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("편집자", THE_RILOG_SLUG));
        theRilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(theRilog, writer));
        headlines = chapterRepository.saveAndFlush(Chapter.create(theRilog, "headlines", 0));
        spotlights = chapterRepository.saveAndFlush(Chapter.create(theRilog, "spotlights", 1));
    }

    @Test
    @DisplayName("더 리로그 글을 발행하면 공식 블로그 slug를 반환한다.")
    void publishTheRilogReturnsOfficialSlug() {
        // given
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        PostPublishResult expectedResult = new PostPublishResult(savedPost.getId(), THE_RILOG_SLUG);
        assertThat(result).isEqualTo(expectedResult);
    }

    @Test
    @DisplayName("더 리로그 글을 발행하면 요청자가 작성자가 되고 공식 Rilog에 저장된다.")
    void publishTheRilogAssociatesWriterAndOfficialRilog() {
        // given
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(savedPost.getUser().getId()).isEqualTo(writer.getId());
        assertThat(savedPost.getRilog().getId()).isEqualTo(theRilog.getId());
    }

    @Test
    @DisplayName("더 리로그 글을 발행하면 팀 블로그와 관계를 맺지 않는다.")
    void publishTheRilogDoesNotAssociateColog() {
        // given
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(savedPost.getColog()).isNull();
    }

    @ParameterizedTest
    @CsvSource({
            "DAILY_HEADLINES, headlines",
            "ENTERPRISE_SPOTLIGHT, spotlights",
            "PERSONAL_SPOTLIGHT, spotlights"
    })
    @DisplayName("더 리로그 발행은 유형에 맞는 기존 챕터를 선택한다.")
    void publishTheRilogSelectsChapterForPostType(PostType postType, String expectedChapterName) {
        // given
        TheRilogPostPublishCommand command = command(postType);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(savedPost.getChapter().getName()).isEqualTo(expectedChapterName);
        assertThat(savedPost.getChapter().getBlog().getId()).isEqualTo(theRilog.getId());
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"DAILY_HEADLINES", "ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("더 리로그 글을 발행하면 요청한 공식 유형이 저장된다.")
    void publishTheRilogPersistsRequestedPostType(PostType postType) {
        // given
        TheRilogPostPublishCommand command = command(postType);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(savedPost.getPostType()).isEqualTo(postType);
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("스포트라이트를 발행하면 요약 설명이 저장된다.")
    void publishSpotlightPersistsDescription(PostType postType) {
        // given
        TheRilogPostPublishCommand command = command(postType);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(savedPost.getDescription()).isEqualTo(SPOTLIGHT_DESCRIPTION);
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("스포트라이트를 발행하면 출처 프로필을 값으로 저장한다.")
    void publishSpotlightPersistsSourceProfile(PostType postType) {
        // given
        TheRilogPostPublishCommand command = command(postType);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        PostSource expectedSource = PostSource.create(SOURCE_PROFILE_NAME, SOURCE_PROFILE_IMAGE);
        assertThat(savedPost.getSource()).isEqualTo(expectedSource);
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("스포트라이트 출처 이미지를 생략해도 출처 이름은 저장된다.")
    void publishSpotlightPersistsSourceNameWithoutProfileImage(PostType postType) {
        // given
        TheRilogPostPublishCommand command = spotlightCommand(postType, SOURCE_PROFILE_NAME, null);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        PostSource expectedSource = PostSource.create(SOURCE_PROFILE_NAME, null);
        assertThat(savedPost.getSource()).isEqualTo(expectedSource);
    }

    @Test
    @DisplayName("뉴스를 발행하면 더 리로그 설명이 비어 있다.")
    void publishNewsLeavesDescriptionEmpty() {
        // given
        TheRilogPostPublishCommand command = command(PostType.DAILY_HEADLINES);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(savedPost.getDescription()).isNull();
    }

    @Test
    @DisplayName("뉴스를 발행하면 출처가 비어 있다.")
    void publishNewsLeavesSourceEmpty() {
        // given
        TheRilogPostPublishCommand command = command(PostType.DAILY_HEADLINES);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(savedPost.getSource()).isNull();
    }

    @Test
    @DisplayName("기존 발행은 STANDARD 글을 저장한다.")
    void publishStandardPostPersistsStandardType() {
        // given
        PostSaveCommand command = standardPublishCommand();

        // when
        PostPublishResult result = postService.publish(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(savedPost.getPostType()).isEqualTo(PostType.STANDARD);
    }

    @Test
    @DisplayName("기존 발행은 더 리로그 설명을 저장하지 않는다.")
    void publishStandardPostLeavesDescriptionEmpty() {
        // given
        PostSaveCommand command = standardPublishCommand();

        // when
        PostPublishResult result = postService.publish(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(savedPost.getDescription()).isNull();
    }

    @Test
    @DisplayName("기존 발행은 출처를 저장하지 않는다.")
    void publishStandardPostLeavesSourceEmpty() {
        // given
        PostSaveCommand command = standardPublishCommand();

        // when
        PostPublishResult result = postService.publish(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(savedPost.getSource()).isNull();
    }

    @Test
    @DisplayName("더 리로그 글을 발행하면 조회수가 0으로 초기화된다.")
    void publishTheRilogInitializesViewCount() {
        // given
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when
        PostPublishResult result = postService.publishTheRilog(command, writer.getId());

        // then
        assertThat(postViewCountRepository.findViewCountByPostId(result.postId()))
                .contains(0L);
    }

    @Test
    @DisplayName("더 리로그 글 상세 조회는 기존 canonical 경로를 사용한다.")
    void readTheRilogPostDetailUsesExistingCanonicalPath() {
        // given
        PostPublishResult result = postService.publishTheRilog(command(PostType.ENTERPRISE_SPOTLIGHT), writer.getId());

        // when
        String title = postService.readPostDetailByCanonicalPath(THE_RILOG_SLUG, result.postId(), null)
                .title();

        // then
        assertThat(title).isEqualTo("제목");
    }

    @Test
    @DisplayName("더 리로그 글을 수정하면 canonical 상세 조회에 수정한 제목이 반환된다.")
    void updateTheRilogPostReturnsUpdatedTitleFromCanonicalDetail() {
        // given
        PostPublishResult published = postService.publishTheRilog(command(PostType.ENTERPRISE_SPOTLIGHT), writer.getId());

        // when
        postService.update(updateCommand("수정한 제목", null, null), published.postId(), writer.getId());

        // then
        String title = postService.readPostDetailByCanonicalPath(THE_RILOG_SLUG, published.postId(), null)
                .title();
        assertThat(title).isEqualTo("수정한 제목");
    }

    @Test
    @DisplayName("더 리로그 글을 수정하면 기존 수정 경로로 제목이 변경된다.")
    void updateTheRilogPostChangesTitleThroughExistingEditPath() {
        // given
        PostPublishResult published = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());

        // when
        postService.update(updateCommand("수정한 제목", null, null), published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        assertThat(savedPost.getTitle()).isEqualTo("수정한 제목");
    }

    @Test
    @DisplayName("더 리로그 글을 수정하면 기존 수정 경로로 본문이 변경된다.")
    void updateTheRilogPostChangesContentThroughExistingEditPath() {
        // given
        PostPublishResult published = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());
        PostUpdateCommand command = updateCommand("수정한 제목", null, null);

        // when
        postService.update(command, published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        assertThat(savedPost.getContent()).isEqualTo(PostContent.from(command.content()));
    }

    @Test
    @DisplayName("더 리로그 글을 수정할 때 챕터를 생략하면 챕터가 해제된다.")
    void updateTheRilogPostClearsChapterWhenChapterIsOmitted() {
        // given
        PostPublishResult published = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());

        // when
        postService.update(updateCommand("수정한 제목", null, null), published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        assertThat(savedPost.getChapter()).isNull();
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("더 리로그 글을 수정해도 공식 유형이 유지된다.")
    void updateTheRilogPostPreservesPostType(PostType postType) {
        // given
        PostPublishResult published = postService.publishTheRilog(command(postType), writer.getId());

        // when
        postService.update(updateCommand("수정한 제목", null, null), published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        assertThat(savedPost.getPostType()).isEqualTo(postType);
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("더 리로그 글을 수정해도 요약 설명이 유지된다.")
    void updateTheRilogPostPreservesDescription(PostType postType) {
        // given
        PostPublishResult published = postService.publishTheRilog(command(postType), writer.getId());

        // when
        postService.update(updateCommand("수정한 제목", null, null), published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        assertThat(savedPost.getDescription()).isEqualTo(SPOTLIGHT_DESCRIPTION);
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("더 리로그 글을 수정해도 출처 프로필이 유지된다.")
    void updateTheRilogPostPreservesSource(PostType postType) {
        // given
        PostPublishResult published = postService.publishTheRilog(command(postType), writer.getId());

        // when
        postService.update(updateCommand("수정한 제목", null, null), published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        assertThat(savedPost.getSource()).isEqualTo(PostSource.create(SOURCE_PROFILE_NAME, SOURCE_PROFILE_IMAGE));
    }

    @Test
    @DisplayName("더 리로그 글을 수정할 때 기존 일반 글 제목 규칙이 적용된다.")
    void updateTheRilogPostUsesStandardTitleRule() {
        // given
        PostPublishResult published = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());
        String title = "가".repeat(21);

        // when
        postService.update(updateCommand(title, null, null), published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        assertThat(savedPost.getTitle()).isEqualTo(title);
    }

    @Test
    @DisplayName("더 리로그 글을 수정할 때 기존 챕터 변경 규칙이 적용된다.")
    void updateTheRilogPostChangesChapterThroughExistingEditPath() {
        // given
        PostPublishResult published = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());

        // when
        postService.update(updateCommand("수정한 제목", null, headlines.getId()), published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        assertThat(savedPost.getChapter().getId()).isEqualTo(headlines.getId());
    }

    @Test
    @DisplayName("더 리로그 글을 수정할 때 멤버인 Colog로 이동할 수 있다.")
    void updateTheRilogPostCanTransferToMemberColog() {
        // given
        Blog colog = blogRepository.saveAndFlush(Blog.createColog(writer, "team", BlogFixture.cologProfile()));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, writer));
        PostPublishResult published = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());

        // when
        PostUpdateResult result = postService.update(updateCommand("변경", "team", null), published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        assertThat(result.slug()).isEqualTo("team");
        assertThat(savedPost.getColog().getId()).isEqualTo(colog.getId());
    }

    @Test
    @DisplayName("더 리로그 글을 Colog로 이동해도 출처 프로필이 유지된다.")
    void updateTheRilogPostToCologPreservesSource() {
        // given
        Blog colog = blogRepository.saveAndFlush(Blog.createColog(writer, "team", BlogFixture.cologProfile()));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, writer));
        PostPublishResult published = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());

        // when
        postService.update(updateCommand("변경", "team", null), published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        assertThat(savedPost.getSource()).isEqualTo(PostSource.create(SOURCE_PROFILE_NAME, SOURCE_PROFILE_IMAGE));
    }

    @Test
    @DisplayName("작성자가 아닌 사용자가 더 리로그 글을 수정하면 제목이 유지된다.")
    void updateTheRilogPostRejectsNonAuthorAndKeepsTitle() {
        // given
        PostPublishResult published = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());
        User other = userRepository.saveAndFlush(UserFixture.user(444L, "other_writer"));

        // when & then
        assertThatThrownBy(() -> postService.update(updateCommand("변경", null, null), published.postId(), other.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
        assertThat(findPost(published.postId()).getTitle()).isEqualTo("제목");
    }

    @Test
    @DisplayName("공식 블로그 소유자가 아니면 더 리로그 글과 조회수가 저장되지 않는다.")
    void publishTheRilogRejectsNonOwnerWithoutPartialWrites() {
        // given
        User other = userRepository.saveAndFlush(UserFixture.user(333L, "other"));
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when & then
        assertThatThrownBy(() -> postService.publishTheRilog(command, other.getId()))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());
        assertThat(postRepository.count()).isZero();
        assertThat(viewCountRows()).isZero();
    }

    @Test
    @DisplayName("유형에 맞는 챕터가 없으면 더 리로그 글과 조회수가 저장되지 않는다.")
    void publishTheRilogRejectsMissingChapterWithoutPartialWrites() {
        // given
        chapterRepository.delete(spotlights);
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when & then
        assertThatThrownBy(() -> postService.publishTheRilog(command, writer.getId()))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());
        assertThat(postRepository.count()).isZero();
        assertThat(viewCountRows()).isZero();
    }

    @Test
    @DisplayName("유형에 맞는 챕터가 삭제됐으면 더 리로그 글과 조회수가 저장되지 않는다.")
    void publishTheRilogRejectsDeletedChapterWithoutPartialWrites() {
        // given
        spotlights.delete();
        chapterRepository.saveAndFlush(spotlights);
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when & then
        assertThatThrownBy(() -> postService.publishTheRilog(command, writer.getId()))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());
        assertThat(postRepository.count()).isZero();
        assertThat(viewCountRows()).isZero();
    }

    private TheRilogPostPublishCommand command(PostType postType) {
        if (postType.isSpotlight()) {
            return spotlightCommand(postType, SOURCE_PROFILE_NAME, SOURCE_PROFILE_IMAGE);
        }
        return new TheRilogPostPublishCommand(
                postType,
                new PostDetail("제목", content(paragraph("본문")).getContent(), TECH, PUBLIC, null),
                null,
                null,
                null
        );
    }

    private TheRilogPostPublishCommand spotlightCommand(PostType postType, String sourceProfileName, String sourceProfileImage) {
        return new TheRilogPostPublishCommand(
                postType,
                new PostDetail("제목", content(paragraph("본문")).getContent(), TECH, PUBLIC, null),
                SPOTLIGHT_DESCRIPTION,
                sourceProfileName,
                sourceProfileImage
        );
    }

    private PostSaveCommand standardPublishCommand() {
        return new PostSaveCommand(
                THE_RILOG_SLUG,
                "일반 글",
                content(paragraph("본문")).getContent(),
                TECH,
                PUBLIC,
                null,
                null
        );
    }

    private PostUpdateCommand updateCommand(String title, String slug, Long chapterId) {
        return new PostUpdateCommand(
                slug == null ? THE_RILOG_SLUG : slug,
                title,
                content(paragraph("수정한 본문")).getContent(),
                TECH,
                PUBLIC,
                null,
                chapterId
        );
    }

    private Post findPost(Long postId) {
        return postRepository.findDetailById(postId)
                .orElseThrow();
    }

    private Long viewCountRows() {
        return jdbc.queryForObject("select count(*) from post_view_count", Long.class);
    }
}
