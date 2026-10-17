package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.post.view.ViewerIdentity;
import kr.rilog.domain.upload.event.TagAssetsEvent;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.UUID;

import static kr.rilog.domain.blog.entity.enums.BlogMemberStatus.ACTIVE;
import static kr.rilog.domain.post.entity.enums.PostStatus.DRAFT;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PRIVATE;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_MISSING;
import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(PostViewCountIntegrationTest.EventFailureConfiguration.class)
class PostViewCountIntegrationTest extends ServiceSupport {

    @Autowired
    private PostService postService;
    @Autowired
    private DraftService draftService;
    @Autowired
    private PostRepository postRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private BlogRepository blogRepository;
    @Autowired
    private BlogMemberRepository blogMemberRepository;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private PostViewStore postViewStore;
    @Autowired
    private PublicationEventFailure eventFailure;

    @BeforeEach
    void resetEventFailure() {
        eventFailure.reset();
    }

    @Test
    @DisplayName("게시글을 발행하면 조회수 누계를 0으로 저장한다.")
    void publicationCreatesZeroCount() {
        // given
        Scenario scenario = scenario();

        // when
        long postId = publish(scenario);

        // then
        assertThat(count(postId)).isZero();
    }

    @Test
    @DisplayName("임시저장 글을 발행하면 발행 시점에 조회수 누계를 생성한다.")
    void draftGetsCountOnlyWhenPublished() {
        // given
        Scenario scenario = scenario();
        long draftId = draftService.saveDraft(PostFixture.initialDraftSaveCommand(), scenario.writer().getId()).draftId();
        assertThat(jdbc.queryForObject("select count(*) from post_view_count", Long.class)).isZero();

        // when
        draftService.publishDraft(PostFixture.publicDraftPublishCommand(scenario.blog().getSlug()), draftId, scenario.writer().getId());

        // then
        assertThat(count(draftId)).isZero();
    }

    @Test
    @DisplayName("상세 조회를 반복해도 저장된 조회수가 증가하지 않는다.")
    void repeatedDetailReadsDoNotIncrementStoredCount() {
        // given
        Scenario scenario = scenario();
        long postId = publish(scenario);
        jdbc.update("update post_view_count set view_count = 42 where post_id = ?", postId);

        // when
        for (int i = 0; i < 3; i++) {
            postService.readPostDetailByCanonicalPath(scenario.blog().getSlug(), postId, null);
        }

        // then
        assertThat(count(postId)).isEqualTo(42L);
        assertThat(jdbc.queryForObject("select count(*) from post_view_count", Long.class)).isEqualTo(1L);
    }

    @Test
    @DisplayName("삭제 권한이 있는 독자의 상세 조회에서 누계가 유실되면 조회수 오류가 발생한다.")
    void missingCountFailsForReaderWithDeletePermission() {
        // given
        Scenario scenario = scenario();
        long postId = publish(scenario);
        jdbc.update("delete from post_view_count where post_id = ?", postId);

        // when & then
        assertThatThrownBy(() -> postService.readPostDetailByCanonicalPath(
                scenario.blog().getSlug(), postId, scenario.writer().getId()))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(POST_VIEW_COUNT_MISSING.getMessage());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = 999L)
    @DisplayName("삭제 권한이 없는 독자의 상세 조회는 조회수 누계가 유실되어도 조회수를 숨긴다.")
    void readersWithoutDeletePermissionDoNotNeedStoredCount(Long requesterId) {
        // given
        Scenario scenario = scenario();
        long postId = publish(scenario);
        jdbc.update("delete from post_view_count where post_id = ?", postId);

        // when
        PostDetailResponse response = postService.readPostDetailByCanonicalPath(scenario.blog().getSlug(), postId, requesterId);

        // then
        assertThat(response.viewCount()).isNull();
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @DisplayName("삭제 권한이 있는 작성자는 상세 조회에서 미반영 조회수를 포함한 누계를 받는다.")
    void authorDetailIncludesPendingViews(boolean editable) {
        // given
        Scenario scenario = scenario();
        long postId = publish(scenario);
        jdbc.update("update post_view_count set view_count = 42 where post_id = ?", postId);
        postViewStore.recordView(postId, ViewerIdentity.anonymous(UUID.randomUUID()));

        // when
        PostDetailResponse response = readDetail(scenario, postId, editable);

        // then
        assertThat(response.viewCount()).isEqualTo(43L);
    }

    @ParameterizedTest
    @CsvSource({"OWNER,true", "ADMIN,true", "MEMBER,false"})
    @DisplayName("팀 블로그 독자의 상세 조회수는 기존 삭제 권한에 따라 공개된다.")
    void cologDetailCountFollowsExistingDeletePermission(BlogPermission permission, boolean canDelete) {
        // given
        CologScenario scenario = cologScenario(permission);
        long postId = publish(scenario.author());
        jdbc.update("update post_view_count set view_count = 42 where post_id = ?", postId);

        // when
        PostDetailResponse response = postService.readPostDetailByCanonicalPath(
                scenario.author().blog().getSlug(), postId, scenario.reader().getId());

        // then
        assertThat(response.viewerPermissions()).isEqualTo(PostDetailResponse.ViewerPermissionsResponse.of(false, canDelete));
        assertThat(response.viewCount()).isEqualTo(canDelete ? 42L : null);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @DisplayName("팀 블로그에서 탈퇴한 작성자는 상세 조회에서 조회수를 볼 수 없다.")
    void departedAuthorCannotSeeCount(boolean editable) {
        // given
        CologScenario scenario = cologScenario(BlogPermission.OWNER);
        long postId = publish(scenario.author());
        BlogMember authorMember = blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                scenario.author().blog().getId(), scenario.author().writer().getId(),
                ACTIVE).orElseThrow();
        authorMember.leaveBySelf();
        blogMemberRepository.saveAndFlush(authorMember);

        // when
        PostDetailResponse response = readDetail(scenario.author(), postId, editable);

        // then
        assertThat(response.viewerPermissions()).isEqualTo(PostDetailResponse.ViewerPermissionsResponse.none());
        assertThat(response.viewCount()).isNull();
    }

    @Test
    @DisplayName("발행 중 이벤트 발행에 실패하면 게시글과 조회수 누계가 함께 롤백된다.")
    void publicationFailureRollsBackPostAndCount() {
        // given
        Scenario scenario = scenario();
        eventFailure.failOn(TagAssetsEvent.Attach.class);

        // when & then
        assertThatThrownBy(() -> publish(scenario))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(INTERNAL_SERVER_ERROR.getMessage());
        assertThat(postRepository.findAll()).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from post_view_count", Long.class)).isZero();
    }

    @Test
    @DisplayName("임시저장 글의 발행 중 이벤트 발행에 실패하면 초안 상태와 조회수 누계가 함께 롤백된다.")
    void draftPublicationFailureRollsBackStatusAndCount() {
        // given
        Scenario scenario = scenario();
        long draftId = draftService.saveDraft(PostFixture.initialDraftSaveCommand(), scenario.writer().getId()).draftId();
        eventFailure.failOn(TagAssetsEvent.Synchronize.class);

        // when & then
        assertThatThrownBy(() -> draftService.publishDraft(
                PostFixture.publicDraftPublishCommand(scenario.blog().getSlug()), draftId, scenario.writer().getId()))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(INTERNAL_SERVER_ERROR.getMessage());
        assertThat(postRepository.findById(draftId).orElseThrow().getStatus()).isEqualTo(DRAFT);
        assertThat(jdbc.queryForObject("select count(*) from post_view_count", Long.class)).isZero();
    }

    @Test
    @DisplayName("삭제 권한이 있는 작성자는 비공개 게시글의 수정 상세 조회에서 조회수를 받는다.")
    void privateWriterCanReadCount() {
        // given
        Scenario scenario = scenario();
        PostSaveCommand publicCommand = PostFixture.publicPostPublishCommand(scenario.blog().getSlug());
        PostSaveCommand privateCommand = new PostSaveCommand(publicCommand.slug(), publicCommand.title(),
                publicCommand.content(), publicCommand.category(), PRIVATE, publicCommand.thumbnailImageUrl(), null);
        long postId = postService.publish(privateCommand, scenario.writer().getId()).postId();
        jdbc.update("update post_view_count set view_count = 17 where post_id = ?", postId);

        // when
        PostDetailResponse response = postService.readEditablePostDetail(postId, scenario.writer().getId());

        // then
        assertThat(response.viewCount()).isEqualTo(17L);
    }

    private PostDetailResponse readDetail(Scenario scenario, long postId, boolean editable) {
        return editable
                ? postService.readEditablePostDetail(postId, scenario.writer().getId())
                : postService.readPostDetailByCanonicalPath(scenario.blog().getSlug(), postId, scenario.writer().getId());
    }

    private long publish(Scenario scenario) {
        return postService.publish(PostFixture.publicPostPublishCommand(scenario.blog().getSlug()), scenario.writer().getId()).postId();
    }

    private long count(long postId) {
        return jdbc.queryForObject("select view_count from post_view_count where post_id = ?", Long.class, postId);
    }

    private Scenario scenario() {
        User writer = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("조회수작성자", "view_writer"));
        Blog blog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, writer));
        return new Scenario(writer, blog);
    }

    private CologScenario cologScenario(BlogPermission permission) {
        Scenario personal = scenario();
        User owner = saveReader(9998L, "count_owner", "팀소유자");
        Blog colog = blogRepository.saveAndFlush(BlogFixture.createPersistableColog(owner, "count_colog"));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, owner));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.blogMember(colog, personal.writer()));
        User reader = owner;
        if (permission != BlogPermission.OWNER) {
            reader = saveReader(9999L, "count_reader", "팀독자");
            blogMemberRepository.saveAndFlush(BlogMember.invite(colog, reader, null, permission, LocalDateTime.of(2026, 10, 1, 0, 0)));
        }
        return new CologScenario(new Scenario(personal.writer(), colog), reader);
    }

    private User saveReader(long githubId, String slug, String nickname) {
        User reader = UserFixture.user(githubId, slug);
        reader.completeOnboarding(nickname, slug, "소개", null, "https://github.com/" + slug, slug + "@example.com");
        return userRepository.saveAndFlush(reader);
    }

    private record Scenario(User writer, Blog blog) {
    }

    private record CologScenario(Scenario author, User reader) {
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class EventFailureConfiguration {

        @Bean
        PublicationEventFailure publicationEventFailure() {
            return new PublicationEventFailure();
        }
    }

    static class PublicationEventFailure {

        private Class<? extends TagAssetsEvent> failureType;

        void failOn(Class<? extends TagAssetsEvent> failureType) {
            this.failureType = failureType;
        }

        void reset() {
            failureType = null;
        }

        @EventListener
        public void receive(TagAssetsEvent event) {
            if (failureType != null && failureType.isInstance(event)) {
                throw new RilogInfrastructureException(INTERNAL_SERVER_ERROR);
            }
        }
    }
}
