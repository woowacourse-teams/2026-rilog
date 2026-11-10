package kr.rilog.domain.post.service;

import kr.rilog.domain.admin.service.AdminPostImportService;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.CologCommandService;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PRIVATE;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static org.assertj.core.api.Assertions.assertThat;

class PostCountCacheIntegrationTest extends ServiceSupport {

    @Autowired
    private PostCommandService postCommandService;
    @Autowired
    private PostQueryService postQueryService;

    @Autowired
    private DraftCommandService draftCommandService;

    @Autowired
    private AdminPostImportService adminPostImportService;

    @Autowired
    private CologCommandService cologCommandService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("초안을 공개 발행하면 커밋 후 다음 집계에 반영된다.")
    void draftPublishInvalidatesCountAfterCommit() {
        // given
        User writer = saveWriter();
        Blog rilog = saveRilog(writer);
        Post draft = postRepository.saveAndFlush(PostFixture.publicDraftRilogPost(rilog, writer));
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isZero();

        // when
        PostPublishResult result = draftCommandService.publishDraft(
                PostFixture.publicDraftPublishCommand(rilog.getSlug()), draft.getId(), writer.getId()
        );

        // then
        assertThat(postRepository.findById(result.postId()).orElseThrow().getStatus()).isEqualTo(PUBLISHED);
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isEqualTo(1L);
    }

    @Test
    @DisplayName("공개 발행 글을 삭제하면 커밋 후 다음 집계에서 제외한다.")
    void deletePublishedPostInvalidatesCountAfterCommit() {
        // given
        User writer = saveWriter();
        Blog rilog = saveRilog(writer);
        Post post = postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, writer));
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isEqualTo(1L);

        // when
        postCommandService.deletePublishedPost(post.getId(), writer.getId());

        // then
        assertThat(postRepository.findById(post.getId()).orElseThrow().getDeletedAt()).isNotNull();
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isZero();
    }

    @ParameterizedTest(name = "기존 비공개 여부: {0}")
    @ValueSource(booleans = {false, true})
    @DisplayName("발행 글의 공개 집계 포함 여부가 바뀌면 커밋 후 다음 집계에 반영된다.")
    void visibilityTransitionInvalidatesCountAfterCommit(boolean initiallyPrivate) {
        // given
        User writer = saveWriter();
        Blog rilog = saveRilog(writer);
        Post post = postRepository.saveAndFlush(initiallyPrivate
                ? PostFixture.privatePublishedRilogPost(rilog, writer)
                : PostFixture.publicPublishedRilogPost(rilog, writer));
        PostVisibility targetVisibility = initiallyPrivate ? PUBLIC : PRIVATE;
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isEqualTo(initiallyPrivate ? 0L : 1L);

        // when
        postCommandService.update(updateCommand(post, post.getTitle(), targetVisibility), post.getId(), writer.getId());

        // then
        assertThat(postRepository.findById(post.getId()).orElseThrow().getVisibility()).isEqualTo(targetVisibility);
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isEqualTo(initiallyPrivate ? 1L : 0L);
    }

    @Test
    @DisplayName("코로그를 삭제하면 함께 삭제한 공개 글이 커밋 후 다음 집계에서 제외된다.")
    void deleteCologInvalidatesCountAfterCommit() {
        // given
        User writer = saveWriter();
        Blog rilog = saveRilog(writer);
        Blog colog = blogRepository.saveAndFlush(
                Blog.createColog(writer, "count_cache_colog", BlogFixture.cologProfile())
        );
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, writer));
        Post cologPost = postRepository.saveAndFlush(PostFixture.publicPublishedColog(rilog, colog, writer));
        postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, writer));
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isEqualTo(2L);

        // when
        cologCommandService.deleteColog(writer.getId(), colog.getSlug());

        // then
        assertThat(postRepository.findById(cologPost.getId()).orElseThrow().getDeletedAt()).isNotNull();
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isEqualTo(1L);
    }

    @Test
    @DisplayName("공개 글 발행을 롤백하면 글이 저장되지 않고 기존 집계 캐시도 유지된다.")
    void rolledBackPublishPreservesCachedCountAndDatabaseState() {
        // given
        User writer = saveWriter();
        Blog rilog = saveRilog(writer);
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isZero();
        // 이벤트 없는 직접 저장으로 불필요한 캐시 무효화도 관찰한다.
        postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, writer));

        // when
        PostPublishResult result = new TransactionTemplate(transactionManager).execute(status -> {
            PostPublishResult published = postCommandService.publish(
                    PostFixture.publicPostPublishCommand(rilog.getSlug()), writer.getId()
            );
            status.setRollbackOnly();
            return published;
        });

        // then
        assertThat(postRepository.findById(result.postId())).isEmpty();
        assertThat(postRepository.countByStatusAndVisibilityAndDeletedAtIsNull(PUBLISHED, PUBLIC)).isEqualTo(1L);
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isZero();
    }

    @Test
    @DisplayName("공개 글의 제목만 수정하면 집계 캐시를 유지한다.")
    void titleOnlyUpdatePreservesCachedCount() {
        // given
        User writer = saveWriter();
        Blog rilog = saveRilog(writer);
        Post post = postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, writer));
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isEqualTo(1L);
        postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, writer));

        // when
        postCommandService.update(updateCommand(post, "수정된 제목", PUBLIC), post.getId(), writer.getId());

        // then
        assertThat(postRepository.findById(post.getId()).orElseThrow().getTitle()).isEqualTo("수정된 제목");
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isEqualTo(1L);
    }

    @Test
    @DisplayName("비공개 글을 발행하면 집계 캐시를 유지한다.")
    void privatePublishPreservesCachedCount() {
        // given
        User writer = saveWriter();
        Blog rilog = saveRilog(writer);
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isZero();
        postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, writer));
        PostSaveCommand publicCommand = PostFixture.publicPostPublishCommand(rilog.getSlug());
        PostSaveCommand privateCommand = new PostSaveCommand(
                publicCommand.slug(), publicCommand.title(), publicCommand.content(), publicCommand.category(),
                PRIVATE, publicCommand.thumbnailImageUrl(), publicCommand.chapterId()
        );

        // when
        PostPublishResult result = postCommandService.publish(privateCommand, writer.getId());

        // then
        assertThat(postRepository.findById(result.postId()).orElseThrow().getVisibility()).isEqualTo(PRIVATE);
        assertThat(postQueryService.readPostsCount().totalPostsCount()).isZero();
    }

    private User saveWriter() {
        return userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("집계작성자", "count_cache_writer")
        );
    }

    private Blog saveRilog(User writer) {
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(rilog, writer));
        return rilog;
    }

    private PostUpdateCommand updateCommand(Post post, String title, PostVisibility visibility) {
        return new PostUpdateCommand(
                post.getOwnSlug(), title, post.getContent().getContent(), post.getCategory(),
                visibility, post.getThumbnailImageUrl(), null
        );
    }
}
