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
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.TheRilogPostPublishCommand;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.support.fixure.PostContentFixture.*;
import static org.assertj.core.api.Assertions.*;

class TheRilogPostIntegrationTest extends ServiceSupport {
    @Autowired PostService postService;
    @Autowired PostRepository postRepository;
    @Autowired UserRepository userRepository;
    @Autowired BlogRepository blogRepository;
    @Autowired BlogMemberRepository blogMemberRepository;
    @Autowired ChapterRepository chapterRepository;
    @Autowired JdbcTemplate jdbc;

    private User writer;
    private Blog blog;
    private Chapter headlines;
    private Chapter spotlights;

    @BeforeEach
    void setUpTheRilogBlog() {
        writer = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("편집자", "the_rilog"));
        blog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, writer));
        headlines = chapterRepository.saveAndFlush(Chapter.create(blog, "headlines", 0));
        spotlights = chapterRepository.saveAndFlush(Chapter.create(blog, "spotlights", 1));
    }

    @ParameterizedTest
    @CsvSource({
            "DAILY_HEADLINES, headlines",
            "ENTERPRISE_SPOTLIGHT, spotlights",
            "PERSONAL_SPOTLIGHT, spotlights"
    })
    void publishingServiceSelectsChapterForPostType(PostType type, String expectedChapterName) {
        Long id = postService.publishTheRilog(command(type), writer.getId()).postId();
        Post saved = postRepository.findDetailById(id).orElseThrow();
        assertThat(saved.getChapter().getName()).isEqualTo(expectedChapterName);
        assertThat(saved.getChapter().getBlog().getId()).isEqualTo(blog.getId());
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    void publishAndExistingEditPersistMetadataAndReusePublicationSideEffects(PostType type) {
        Long postId = postService.publishTheRilog(command(type), writer.getId()).postId();
        postService.update(new PostUpdateCommand("the_rilog", "수정한 제목", content(paragraph("수정한 본문")).getContent(),
                TECH, PUBLIC, null, null), postId, writer.getId());
        Post saved = postRepository.findDetailById(postId).orElseThrow();
        assertThat(saved.getPostType()).isEqualTo(type);
        assertThat(saved.getTitle()).isEqualTo("수정한 제목");
        assertThat(saved.getDescription()).isEqualTo("핵심 요약");
        assertThat(saved.getChapter()).isNull();
        assertThat(saved.getColog()).isNull();
        assertThat(saved.getUser().getId()).isEqualTo(writer.getId());
        assertThat(jdbc.queryForObject("select source_profile_name from post_source where post_id = ?", String.class, postId))
                .isEqualTo("출처 이름");
        assertThat(jdbc.queryForObject("select source_profile_image from post_source where post_id = ?", String.class, postId))
                .isEqualTo("https://example.com/profile.png");
        assertThat(saved.getSource().getSourceProfileName()).isEqualTo("출처 이름");
        assertThat(jdbc.queryForObject("select view_count from post_view_count where post_id = ?", Long.class, postId)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from hard_trending where post_id = ?", Long.class, postId)).isEqualTo(1L);
        assertThat(postService.readPostDetailByCanonicalPath("the_rilog", postId, null).title()).isEqualTo("수정한 제목");
    }

    @Test
    void publishesNewsIntoHeadlinesWithoutSource() {
        Long id = postService.publishTheRilog(command(PostType.DAILY_HEADLINES), writer.getId()).postId();
        Post saved = postRepository.findDetailById(id).orElseThrow();
        assertThat(saved.getPostType()).isEqualTo(PostType.DAILY_HEADLINES);
        assertThat(saved.getChapter().getId()).isEqualTo(headlines.getId());
        assertThat(saved.getSource()).isNull();
        assertThat(saved.getDescription()).isNull();
        assertThat(jdbc.queryForObject("select count(*) from post_source", Long.class)).isZero();
    }

    @Test
    void ordinaryPublishStillCreatesStandardWithoutSource() {
        Long id = postService.publish(new PostSaveCommand("the_rilog", "일반 글", content(paragraph("본문")).getContent(),
                TECH, PUBLIC, null, null), writer.getId()).postId();
        Post saved = postRepository.findDetailById(id).orElseThrow();
        assertThat(saved.getPostType()).isEqualTo(PostType.STANDARD);
        assertThat(saved.getDescription()).isNull();
        assertThat(saved.getSource()).isNull();
    }

    @Test
    void rejectsNonOwnerAndMissingChapterWithoutPartialWrites() {
        User other = userRepository.saveAndFlush(UserFixture.user(333L, "other"));
        assertThatThrownBy(() -> postService.publishTheRilog(command(PostType.ENTERPRISE_SPOTLIGHT), other.getId()))
                .isInstanceOf(BlogException.class);
        chapterRepository.delete(spotlights);
        assertThatThrownBy(() -> postService.publishTheRilog(command(PostType.ENTERPRISE_SPOTLIGHT), writer.getId()))
                .isInstanceOf(ChapterException.class);
        assertThat(postRepository.count()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from post_source", Long.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from post_view_count", Long.class)).isZero();
    }

    @Test
    void existingEditUsesOrdinaryTitleAndChapterRules() {
        Long id = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId()).postId();
        postService.update(new PostUpdateCommand("the_rilog", "가".repeat(21), content(paragraph("본문")).getContent(),
                TECH, PUBLIC, null, headlines.getId()), id, writer.getId());
        Post saved = postRepository.findDetailById(id).orElseThrow();
        assertThat(saved.getTitle()).isEqualTo("가".repeat(21));
        assertThat(saved.getChapter().getId()).isEqualTo(headlines.getId());
        assertThat(saved.getPostType()).isEqualTo(PostType.PERSONAL_SPOTLIGHT);
        assertThat(saved.getDescription()).isEqualTo("핵심 요약");
        assertThat(saved.getSource().getSourceProfileName()).isEqualTo("출처 이름");
    }

    @Test
    void existingEditCanTransferToMemberColog() {
        Long id = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId()).postId();
        Blog colog = blogRepository.saveAndFlush(Blog.createColog(writer, "team", BlogFixture.cologProfile()));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, writer));
        postService.update(new PostUpdateCommand("team", "변경", content(paragraph("본문")).getContent(),
                TECH, PUBLIC, null, null), id, writer.getId());
        Post saved = postRepository.findDetailById(id).orElseThrow();
        assertThat(saved.getColog().getId()).isEqualTo(colog.getId());
        assertThat(saved.getChapter()).isNull();
        assertThat(saved.getPostType()).isEqualTo(PostType.PERSONAL_SPOTLIGHT);
        assertThat(saved.getDescription()).isEqualTo("핵심 요약");
        assertThat(saved.getSource().getSourceProfileName()).isEqualTo("출처 이름");
    }

    @Test
    void existingEditStillRequiresWriter() {
        Long id = postService.publishTheRilog(command(PostType.PERSONAL_SPOTLIGHT), writer.getId()).postId();
        User other = userRepository.saveAndFlush(UserFixture.user(444L, "other_writer"));
        assertThatThrownBy(() -> postService.update(new PostUpdateCommand("the_rilog", "변경",
                content(paragraph("본문")).getContent(), TECH, PUBLIC, null, null), id, other.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(kr.rilog.domain.post.exception.PostErrorInformation.NOT_POST_AUTHOR.getMessage());
        assertThat(postRepository.findDetailById(id).orElseThrow().getTitle()).isEqualTo("제목");
    }

    private TheRilogPostPublishCommand command(PostType type) {
        return new TheRilogPostPublishCommand(type,
                new PostDetail("제목", content(paragraph("본문")).getContent(), TECH, PUBLIC, null),
                type.isSpotlight() ? "핵심 요약" : null,
                type.isSpotlight() ? "출처 이름" : null,
                type.isSpotlight() ? "https://example.com/profile.png" : null);
    }
}
