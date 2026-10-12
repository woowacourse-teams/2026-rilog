package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.controller.dto.response.PostSourceResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.PostSource;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.post.service.dto.command.FullFeedSearchCommand;
import kr.rilog.domain.post.service.dto.command.TheRilogPostPublishCommand;
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
    private PostService postService;

    @Autowired
    private FeedService feedService;

    @Autowired
    private TheRilogService theRilogService;

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
    private Chapter spotlights;

    @BeforeEach
    void setUpTheRilogBlog() {
        writer = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("편집자", THE_RILOG_SLUG));
        theRilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(theRilog, writer));
        chapterRepository.saveAndFlush(Chapter.create(theRilog, "headlines", 0));
        spotlights = chapterRepository.saveAndFlush(Chapter.create(theRilog, "spotlights", 1));
    }

    @ParameterizedTest
    @CsvSource({
            "DAILY_HEADLINES, headlines",
            "ENTERPRISE_SPOTLIGHT, spotlights",
            "PERSONAL_SPOTLIGHT, spotlights"
    })
    @DisplayName("더 리로그 발행은 유형에 맞는 기존 챕터에 글을 저장한다.")
    void publishTheRilogPersistsPostInChapterSelectedByType(PostType postType, String expectedChapterName) {
        // given
        TheRilogPostPublishCommand command = command(postType);

        // when
        PostPublishResult result = theRilogService.publishTheRilog(command, writer.getId());

        // then
        Post savedPost = findPost(result.postId());
        assertThat(result).isEqualTo(new PostPublishResult(savedPost.getId(), THE_RILOG_SLUG));
        assertThat(savedPost.getChapter().getName()).isEqualTo(expectedChapterName);
        assertThat(savedPost.getChapter().getBlog().getId()).isEqualTo(theRilog.getId());
    }

    @Test
    @DisplayName("더 리로그 글을 발행하면 조회수가 0으로 초기화된다.")
    void publishTheRilogInitializesViewCount() {
        // given
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when
        PostPublishResult result = theRilogService.publishTheRilog(command, writer.getId());

        // then
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
        assertThatThrownBy(() -> theRilogService.publishTheRilog(command, other.getId()))
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
            chapterRepository.delete(spotlights);
        } else {
            spotlights.delete();
            chapterRepository.saveAndFlush(spotlights);
        }
        TheRilogPostPublishCommand command = command(PostType.ENTERPRISE_SPOTLIGHT);

        // when & then
        assertThatThrownBy(() -> theRilogService.publishTheRilog(command, writer.getId()))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());
        assertThat(postRepository.count()).isZero();
        assertThat(viewCountRows()).isZero();
    }

    @Test
    @DisplayName("메인 피드는 일반 발행 글을 포함하고 더 리로그 전용 발행 글은 제외한다.")
    void mainFeedExcludesTheRilogPublications() {
        // given
        var standard = postService.publish(PostFixture.publicPostPublishCommand(THE_RILOG_SLUG), writer.getId());
        theRilogService.publishTheRilog(command(PostType.DAILY_HEADLINES), writer.getId());
        theRilogService.publishTheRilog(command(PostType.ENTERPRISE_SPOTLIGHT), writer.getId());
        theRilogService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());

        // when
        var feed = feedService.readFullFeedPostList(new FullFeedSearchCommand(null, null, 0, 10));

        // then
        assertThat(feed.posts().stream().map(post -> post.postId()).toList())
                .containsExactly(standard.postId());
    }

    @Test
    @DisplayName("일반 발행은 트렌딩 후보를 저장하고 더 리로그 전용 발행은 후보를 저장하지 않는다.")
    void theRilogPublicationDoesNotRegisterTrendingCandidates() {
        // given
        var standard = postService.publish(PostFixture.publicPostPublishCommand(THE_RILOG_SLUG), writer.getId());

        // when
        theRilogService.publishTheRilog(command(PostType.DAILY_HEADLINES), writer.getId());
        theRilogService.publishTheRilog(command(PostType.ENTERPRISE_SPOTLIGHT), writer.getId());
        theRilogService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());

        // then
        assertThat(jdbc.queryForList("select post_id from hard_trending", Long.class))
                .containsExactly(standard.postId());
    }

    @Test
    @DisplayName("더 리로그 스포트라이트를 팀 블로그로 이동해도 저장된 출처를 상세 조회에서 유지한다.")
    void transferredSpotlightDetailReturnsPersistedSource() {
        // given
        Blog colog = blogRepository.saveAndFlush(Blog.createColog(writer, "team", BlogFixture.cologProfile()));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, writer));
        PostPublishResult published = theRilogService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId());
        PostUpdateCommand command = updateCommand("변경", "team", null);

        // when
        PostUpdateResult result = postService.update(command, published.postId(), writer.getId());

        // then
        Post savedPost = findPost(published.postId());
        PostSource expectedSource = PostSource.create(SOURCE_PROFILE_NAME, SOURCE_PROFILE_IMAGE);
        PostSourceResponse expectedResponse = new PostSourceResponse(SOURCE_PROFILE_NAME, SOURCE_PROFILE_IMAGE);

        assertSoftly(softly -> {
            softly.assertThat(result).isEqualTo(new PostUpdateResult(savedPost.getId(), "team"));
            softly.assertThat(savedPost.getColog().getId()).isEqualTo(colog.getId());
            softly.assertThat(savedPost.getSource()).isEqualTo(expectedSource);
            softly.assertThat(postService.readPostDetailByCanonicalPath("team", published.postId(), null).source())
                    .isEqualTo(expectedResponse);
            softly.assertThat(postService.readEditablePostDetail(published.postId(), writer.getId()).source())
                    .isEqualTo(expectedResponse);
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

    private Post findPost(Long postId) {
        return postRepository.findDetailById(postId)
                .orElseThrow();
    }

    private Long viewCountRows() {
        return jdbc.queryForObject("select count(*) from post_view_count", Long.class);
    }
}
