package kr.rilog.domain.therilog.service;

import kr.rilog.domain.post.service.PostCommandService;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.PostSource;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.therilog.service.dto.command.TheRilogPostPublishCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.post.service.dto.result.PostUpdateResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class TheRilogPostIntegrationTest extends ServiceSupport {

    private static final String THE_RILOG_SLUG = "the_rilog";
    private static final String SPOTLIGHT_DESCRIPTION = "핵심 요약";
    private static final String SOURCE_PROFILE_NAME = "출처 이름";
    private static final String SOURCE_PROFILE_IMAGE = "https://example.com/profile.png";

    @Autowired
    private PostCommandService postCommandService;

    @Autowired
    private TheRilogCommandService theRilogCommandService;

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
    private Chapter enterprise;

    @BeforeEach
    void setUpTheRilogBlog() {
        writer = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("편집자", THE_RILOG_SLUG));
        theRilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(theRilog, writer));
        chapterRepository.saveAndFlush(Chapter.create(theRilog, "news", 0));
        enterprise = chapterRepository.saveAndFlush(Chapter.create(theRilog, "enterprise", 1));
        chapterRepository.saveAndFlush(Chapter.create(theRilog, "personal", 2));
    }

    @ParameterizedTest
    @CsvSource({
            "DAILY_HEADLINES, news",
            "ENTERPRISE_SPOTLIGHT, enterprise",
            "PERSONAL_SPOTLIGHT, personal"
    })
    @DisplayName("더 리로그 발행은 유형에 맞는 기존 챕터에 글을 저장하고 조회수를 초기화한다.")
    void publishTheRilogPersistsPostInChapterAndInitializesViewCount(PostType postType, String expectedChapterName) {
        // given
        TheRilogPostPublishCommand command = command(postType);

        // when
        PostPublishResult result = theRilogCommandService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = postRepository.findDetailByCanonicalPath(Slug.from(result.slug()), result.postId()).orElseThrow();
        assertThat(savedPost.getChapter().getName()).isEqualTo(expectedChapterName);
        assertThat(savedPost.getChapter().getBlog().getId()).isEqualTo(theRilog.getId());
        assertThat(postViewCountRepository.findViewCountByPostId(result.postId()))
                .contains(0L);
    }

    @Test
    @DisplayName("공식 블로그 소유자가 아니면 더 리로그 글과 조회수가 저장되지 않는다.")
    void publishTheRilogRejectsNonOwnerWithoutPartialWrites() {
        // given
        User other = userRepository.saveAndFlush(UserFixture.user(333L, "other"));
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when & then
        assertThatThrownBy(() -> theRilogCommandService.publishTheRilog(command, other.getId()))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());
        assertThat(postRepository.count()).isZero();
        assertThat(viewCountRows()).isZero();
    }

    @ParameterizedTest
    @CsvSource({"missing", "deleted"})
    @DisplayName("유형에 맞는 챕터가 없거나 삭제됐으면 더 리로그 글과 조회수가 저장되지 않는다.")
    void publishTheRilogRejectsUnavailableChapterWithoutPartialWrites(String chapterState) {
        // given
        if ("missing".equals(chapterState)) {
            chapterRepository.delete(enterprise);
        } else {
            enterprise.delete();
            chapterRepository.saveAndFlush(enterprise);
        }
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when & then
        assertThatThrownBy(() -> theRilogCommandService.publishTheRilog(command, writer.getId()))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());
        assertThat(postRepository.count()).isZero();
        assertThat(viewCountRows()).isZero();
    }

    @Test
    @DisplayName("일반 발행과 더 리로그 발행은 배치를 우회하여 트렌딩에 등록하지 않는다.")
    void publicationDoesNotRegisterTrendingBeforeBatch() {
        // given
        postCommandService.publish(PostFixture.publicPostPublishCommand(THE_RILOG_SLUG), writer.getId());

        // when
        theRilogCommandService.publishTheRilog(command(PostType.DAILY_HEADLINES), writer.getId());
        theRilogCommandService.publishTheRilog(command(PostType.ENTERPRISE_SPOTLIGHT), writer.getId());
        theRilogCommandService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());

        // then
        assertThat(jdbc.queryForList("select post_id from trending_post", Long.class))
                .isEmpty();
    }

    @Test
    @DisplayName("팀 블로그로 옮긴 스포트라이트를 새 경로로 조회하면 저장된 출처가 유지된다.")
    void transferredSpotlightPreservesSourceAtNewCanonicalPath() {
        // given
        Blog colog = blogRepository.saveAndFlush(Blog.createColog(writer, "team", BlogFixture.cologProfile()));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, writer));
        PostPublishResult published = theRilogCommandService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());
        PostUpdateCommand command = updateCommand("변경", "team", null);

        // when
        PostUpdateResult result = postCommandService.update(command, published.postId(), writer.getId());

        // then
        Post savedPost = postRepository.findDetailByCanonicalPath(Slug.from(result.slug()), result.postId()).orElseThrow();
        assertSoftly(softly -> {
            softly.assertThat(savedPost.getId()).isEqualTo(published.postId());
            softly.assertThat(savedPost.getColog().getId()).isEqualTo(colog.getId());
            softly.assertThat(savedPost.getSource()).isEqualTo(PostSource.create(SOURCE_PROFILE_NAME, SOURCE_PROFILE_IMAGE));
        });
    }

    private TheRilogPostPublishCommand command(PostType postType) {
        if (postType.isSpotlight()) {
            return new TheRilogPostPublishCommand(
                    postType,
                    detail("제목"),
                    SPOTLIGHT_DESCRIPTION,
                    SOURCE_PROFILE_NAME,
                    SOURCE_PROFILE_IMAGE
            );
        }
        return new TheRilogPostPublishCommand(
                postType,
                detail("제목"),
                null,
                null,
                null
        );
    }

    private PostUpdateCommand updateCommand(String title, String slug, Long chapterId) {
        return new PostUpdateCommand(
                slug,
                title,
                content(paragraph("수정한 본문")).getContent(),
                TECH,
                PUBLIC,
                null,
                chapterId
        );
    }

    private PostDetail detail(String title) {
        return new PostDetail(title, content(paragraph("본문")).getContent(), TECH, PUBLIC, null);
    }

    private Long viewCountRows() {
        return jdbc.queryForObject("select count(*) from post_view_count", Long.class);
    }
}
