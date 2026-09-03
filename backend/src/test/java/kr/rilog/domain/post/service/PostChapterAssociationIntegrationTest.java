package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.DraftPublishCommand;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
import static kr.rilog.domain.post.entity.enums.PostStatus.DRAFT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostChapterAssociationIntegrationTest extends ServiceSupport {

    @Autowired
    private PostService postService;

    @Autowired
    private DraftService draftService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private PostRepository postRepository;

    @Test
    @DisplayName("게시글을 발행할 때 대상 블로그의 챕터를 지정하면 챕터 연결이 저장된다.")
    void publishPersistsChapter() {
        // given
        PublishingScenario scenario = createRilogScenario(1L, "publish-chapter");
        Chapter chapter = saveChapter(scenario.blog(), "발행 챕터", 0);

        // when
        Long postId = postService.publish(
                publishCommand(scenario.blog().getSlug(), chapter.getId()),
                scenario.writer().getId()
        ).postId();

        // then
        Post savedPost = postRepository.findDetailById(postId).orElseThrow();
        assertThat(savedPost.getChapter().getId()).isEqualTo(chapter.getId());
    }

    @Test
    @DisplayName("게시글을 발행할 때 챕터를 생략하면 미분류 게시글로 저장된다.")
    void publishWithoutChapterPersistsUnclassifiedPost() {
        // given
        PublishingScenario scenario = createRilogScenario(2L, "publish-unclassified");

        // when
        Long postId = postService.publish(
                publishCommand(scenario.blog().getSlug(), null),
                scenario.writer().getId()
        ).postId();

        // then
        Post savedPost = postRepository.findDetailById(postId).orElseThrow();
        assertThat(savedPost.getChapter()).isNull();
    }

    @Test
    @DisplayName("다른 블로그의 챕터로 게시글을 발행하면 예외가 발생하고 게시글이 저장되지 않는다.")
    void publishRejectsChapterOfOtherBlogAndPreservesPosts() {
        // given
        PublishingScenario scenario = createRilogScenario(3L, "publish-target");
        PublishingScenario other = createRilogScenario(4L, "publish-other");
        Chapter otherChapter = saveChapter(other.blog(), "다른 블로그 챕터", 0);

        // when & then
        assertThatThrownBy(() -> postService.publish(
                publishCommand(scenario.blog().getSlug(), otherChapter.getId()),
                scenario.writer().getId()
        ))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("삭제된 챕터로 게시글을 발행하면 예외가 발생하고 게시글이 저장되지 않는다.")
    void publishRejectsDeletedChapterAndPreservesPosts() {
        // given
        PublishingScenario scenario = createRilogScenario(5L, "publish-deleted");
        Chapter deletedChapter = saveChapter(scenario.blog(), "삭제된 챕터", 0);
        deletedChapter.delete();
        chapterRepository.saveAndFlush(deletedChapter);

        // when & then
        assertThatThrownBy(() -> postService.publish(
                publishCommand(scenario.blog().getSlug(), deletedChapter.getId()),
                scenario.writer().getId()
        ))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 챕터로 게시글을 발행하면 예외가 발생하고 게시글이 저장되지 않는다.")
    void publishRejectsMissingChapterAndPreservesPosts() {
        // given
        PublishingScenario scenario = createRilogScenario(6L, "publish-missing");

        // when & then
        assertThatThrownBy(() -> postService.publish(
                publishCommand(scenario.blog().getSlug(), Long.MAX_VALUE),
                scenario.writer().getId()
        ))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("초안을 발행할 때 대상 블로그의 챕터를 지정하면 챕터 연결이 저장된다.")
    void publishDraftPersistsChapter() {
        // given
        PublishingScenario scenario = createRilogScenario(7L, "draft-chapter");
        Chapter chapter = saveChapter(scenario.blog(), "초안 발행 챕터", 0);
        Post draft = saveDraft(scenario);

        // when
        draftService.publishDraft(
                draftPublishCommand(scenario.blog().getSlug(), chapter.getId()),
                draft.getId(),
                scenario.writer().getId()
        );

        // then
        Post publishedPost = postRepository.findDetailById(draft.getId()).orElseThrow();
        assertThat(publishedPost.getChapter().getId()).isEqualTo(chapter.getId());
    }

    @Test
    @DisplayName("초안을 발행할 때 챕터를 생략하면 미분류 게시글로 저장된다.")
    void publishDraftWithoutChapterPersistsUnclassifiedPost() {
        // given
        PublishingScenario scenario = createRilogScenario(8L, "draft-unclassified");
        Post draft = saveDraft(scenario);

        // when
        draftService.publishDraft(
                draftPublishCommand(scenario.blog().getSlug(), null),
                draft.getId(),
                scenario.writer().getId()
        );

        // then
        Post publishedPost = postRepository.findDetailById(draft.getId()).orElseThrow();
        assertThat(publishedPost.getChapter()).isNull();
    }

    @Test
    @DisplayName("존재하지 않는 챕터로 초안을 발행하면 예외가 발생하고 초안 상태가 유지된다.")
    void publishDraftRejectsMissingChapterAndPreservesDraft() {
        // given
        PublishingScenario scenario = createRilogScenario(16L, "draft-missing");
        Post draft = saveDraft(scenario);

        // when & then
        assertThatThrownBy(() -> draftService.publishDraft(
                draftPublishCommand(scenario.blog().getSlug(), Long.MAX_VALUE),
                draft.getId(),
                scenario.writer().getId()
        ))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());

        Post preservedDraft = postRepository.findById(draft.getId()).orElseThrow();
        assertThat(preservedDraft.getStatus()).isEqualTo(DRAFT);
    }

    @Test
    @DisplayName("게시글을 수정할 때 챕터를 지정하면 챕터 연결이 저장된다.")
    void updateAssignsChapter() {
        // given
        PublishingScenario scenario = createRilogScenario(9L, "changeAuthorityOf-assign");
        Chapter chapter = saveChapter(scenario.blog(), "지정할 챕터", 0);
        Post post = savePublishedPost(scenario);

        // when
        postService.update(
                updateCommand(scenario.blog().getSlug(), chapter.getId()),
                post.getId(),
                scenario.writer().getId()
        );

        // then
        Post updatedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(updatedPost.getChapter().getId()).isEqualTo(chapter.getId());
    }

    @Test
    @DisplayName("게시글을 수정할 때 다른 챕터를 지정하면 챕터 연결이 변경된다.")
    void updateChangesChapter() {
        // given
        PublishingScenario scenario = createRilogScenario(10L, "changeAuthorityOf-change");
        Chapter previousChapter = saveChapter(scenario.blog(), "기존 챕터", 0);
        Chapter targetChapter = saveChapter(scenario.blog(), "변경 챕터", 1);
        Post post = savePublishedPost(scenario, previousChapter);

        // when
        postService.update(
                updateCommand(scenario.blog().getSlug(), targetChapter.getId()),
                post.getId(),
                scenario.writer().getId()
        );

        // then
        Post updatedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(updatedPost.getChapter().getId()).isEqualTo(targetChapter.getId());
    }

    @Test
    @DisplayName("게시글을 수정할 때 챕터를 생략하면 기존 챕터 연결이 해제된다.")
    void updateClearsChapter() {
        // given
        PublishingScenario scenario = createRilogScenario(11L, "changeAuthorityOf-clear");
        Chapter chapter = saveChapter(scenario.blog(), "해제할 챕터", 0);
        Post post = savePublishedPost(scenario, chapter);

        // when
        postService.update(
                updateCommand(scenario.blog().getSlug(), null),
                post.getId(),
                scenario.writer().getId()
        );

        // then
        Post updatedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(updatedPost.getChapter()).isNull();
    }

    @Test
    @DisplayName("게시글을 다른 블로그로 옮길 때 대상 블로그의 챕터를 지정하면 새 소속과 챕터가 함께 저장된다.")
    void updateToOtherBlogAssignsOnlyTargetBlogChapter() {
        // given
        PublishingScenario scenario = createRilogScenario(12L, "move-writer");
        Blog targetColog = saveColog(scenario.writer(), "move-target");
        Chapter targetChapter = saveChapter(targetColog, "대상 챕터", 0);
        Post post = savePublishedPost(scenario);

        // when
        postService.update(
                updateCommand(targetColog.getSlug(), targetChapter.getId()),
                post.getId(),
                scenario.writer().getId()
        );

        // then
        Post updatedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(updatedPost.getChapter().getId()).isEqualTo(targetChapter.getId());
    }

    @Test
    @DisplayName("게시글을 다른 블로그로 옮길 때 원래 블로그의 챕터를 지정하면 예외가 발생하고 기존 연결이 유지된다.")
    void updateToOtherBlogRejectsSourceBlogChapterAndPreservesChapter() {
        // given
        PublishingScenario scenario = createRilogScenario(13L, "move-invalid-writer");
        Blog targetColog = saveColog(scenario.writer(), "move-invalid-target");
        Chapter sourceChapter = saveChapter(scenario.blog(), "원래 챕터", 0);
        Post post = savePublishedPost(scenario, sourceChapter);

        // when & then
        assertThatThrownBy(() -> postService.update(
                updateCommand(targetColog.getSlug(), sourceChapter.getId()),
                post.getId(),
                scenario.writer().getId()
        ))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());

        Post preservedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(preservedPost.getChapter().getId()).isEqualTo(sourceChapter.getId());
    }

    @Test
    @DisplayName("챕터에 속한 게시글을 상세 조회하면 챕터 전체 정보를 반환한다.")
    void readPostReturnsChapter() {
        // given
        PublishingScenario scenario = createRilogScenario(14L, "read-chapter");
        Chapter chapter = saveChapter(scenario.blog(), "조회 챕터", 2);
        Post post = savePublishedPost(scenario, chapter);

        // when
        PostDetailResponse response = postService.readPostOfBlogs(post.getId(), scenario.writer().getId());

        // then
        assertThat(response.chapter()).isEqualTo(new kr.rilog.domain.chapter.controller.dto.response.ChapterResponse(
                chapter.getId(),
                chapter.getName(),
                chapter.getOrder()
        ));
    }

    @Test
    @DisplayName("미분류 게시글을 상세 조회하면 챕터를 null로 반환한다.")
    void readPostReturnsNullChapterForUnclassifiedPost() {
        // given
        PublishingScenario scenario = createRilogScenario(15L, "read-unclassified");
        Post post = savePublishedPost(scenario);

        // when
        PostDetailResponse response = postService.readPostOfBlogs(post.getId(), null);

        // then
        assertThat(response.chapter()).isNull();
    }

    private PublishingScenario createRilogScenario(long githubId, String slug) {
        User writer = UserFixture.user(githubId, "github-" + githubId);
        writer.completeOnboarding(
                "작성자" + githubId,
                slug,
                "소개",
                null,
                "https://github.com/user" + githubId,
                "user" + githubId + "@example.com"
        );
        userRepository.saveAndFlush(writer);
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(rilog, writer));
        return new PublishingScenario(writer, rilog);
    }

    private Blog saveColog(User owner, String slug) {
        Blog colog = blogRepository.saveAndFlush(Blog.createColog(owner, slug, BlogFixture.cologProfile()));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, owner));
        return colog;
    }

    private Chapter saveChapter(Blog blog, String name, int order) {
        return chapterRepository.saveAndFlush(Chapter.create(blog, name, order));
    }

    private Post saveDraft(PublishingScenario scenario) {
        return postRepository.saveAndFlush(PostFixture.draftRilogPostAt(
                scenario.blog(),
                scenario.writer(),
                "초안",
                LocalDateTime.of(2026, 8, 30, 12, 0)
        ));
    }

    private Post savePublishedPost(PublishingScenario scenario) {
        return savePublishedPost(scenario, null);
    }

    private Post savePublishedPost(PublishingScenario scenario, Chapter chapter) {
        Post post = PostFixture.publicPublishedRilogPost(scenario.blog(), scenario.writer());
        if (chapter != null) {
            post.update(PostFixture.updatedPostDetail(), scenario.blog(), chapter);
        }
        return postRepository.saveAndFlush(post);
    }

    private PostSaveCommand publishCommand(String slug, Long chapterId) {
        PostSaveCommand command = PostFixture.publicPostPublishCommand(slug);
        return new PostSaveCommand(
                command.slug(),
                command.title(),
                command.content(),
                command.category(),
                command.visibility(),
                command.thumbnailImageUrl(),
                chapterId
        );
    }

    private DraftPublishCommand draftPublishCommand(String slug, Long chapterId) {
        DraftPublishCommand command = PostFixture.publicDraftPublishCommand(slug);
        return new DraftPublishCommand(
                command.slug(),
                command.title(),
                command.content(),
                command.category(),
                command.visibility(),
                command.thumbnailImageUrl(),
                chapterId
        );
    }

    private PostUpdateCommand updateCommand(String slug, Long chapterId) {
        PostUpdateCommand command = PostFixture.updateCommandTo(slug);
        return new PostUpdateCommand(
                command.newSlug(),
                command.title(),
                command.content(),
                command.category(),
                command.visibility(),
                command.thumbnailImageUrl(),
                chapterId
        );
    }

    private record PublishingScenario(User writer, Blog blog) {
    }
}
