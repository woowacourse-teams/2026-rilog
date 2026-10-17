package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.post.view.ViewerIdentity;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.UUID;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PRIVATE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "post.view.registration.enabled=true")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PostViewRegistrationIntegrationTest extends ServiceSupport {

    private static final ViewerIdentity ANONYMOUS_VIEWER =
            ViewerIdentity.anonymous(UUID.fromString("23330a5d-00d7-4f91-b45a-c10a1e3bd3ec"));

    @DynamicPropertySource
    static void isolateH2Database(DynamicPropertyRegistry properties) {
        if ("test".equals(System.getProperty("spring.profiles.active", "test"))) {
            // 컨텍스트 종료의 create-drop이 다른 테스트의 공유 H2 스키마를 삭제하지 않게 한다.
            properties.add("spring.datasource.url",
                    () -> "jdbc:h2:mem:rilog_post_view_registration;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        }
    }

    @Autowired
    private PostViewRegistrationService registrationService;
    @Autowired
    private PostViewStore postViewStore;
    @Autowired
    private PostService postService;
    @Autowired
    private PostRepository postRepository;
    @Autowired
    private PostViewCountRepository viewCountRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private BlogRepository blogRepository;
    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Test
    @DisplayName("다른 회원의 방문은 게시글의 메모리 조회수에 반영하고 DB 누계를 변경하지 않는다.")
    void registersReaderVisitInMemoryWithoutUpdatingDatabase() {
        // given
        Scenario scenario = scenario();
        long postId = publish(scenario);
        User reader = UserFixture.user(201L, "view_reader");
        reader.completeOnboarding("다른독자", "view_reader", "소개", null,
                "https://github.com/view_reader", "reader@example.com");
        userRepository.saveAndFlush(reader);

        // when
        registrationService.register(postId, reader.getId(), ViewerIdentity.member(reader.getId()));

        // then
        assertThat(postViewStore.currentCount(postId)).isEqualTo(1L);
        assertThat(viewCountRepository.findViewCountByPostId(postId)).contains(0L);
    }

    @Test
    @DisplayName("저장된 게시글 작성자 본인의 방문은 조회수를 늘리지 않는다.")
    void doesNotRegisterAuthorVisit() {
        // given
        Scenario scenario = scenario();
        long postId = publish(scenario);

        // when
        registrationService.register(postId, scenario.writer().getId(),
                ViewerIdentity.member(scenario.writer().getId()));

        // then
        assertThat(postViewStore.currentCount(postId)).isZero();
    }

    @Test
    @DisplayName("비공개 게시글은 다른 독자의 조회 등록을 거절하고 누계를 유지한다.")
    void rejectsOtherReaderForPrivatePost() {
        // given
        Scenario scenario = scenario();
        var publicCommand = PostFixture.publicPostPublishCommand(scenario.blog().getSlug());
        var privateCommand = new PostSaveCommand(publicCommand.slug(), publicCommand.title(),
                publicCommand.content(), publicCommand.category(), PRIVATE,
                publicCommand.thumbnailImageUrl(), publicCommand.chapterId());
        long postId = postService.publish(privateCommand, scenario.writer().getId()).postId();

        // when & then
        assertThatThrownBy(() -> registrationService.register(postId, null, ANONYMOUS_VIEWER))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
        assertThat(postViewStore.currentCount(postId)).isZero();
        assertThat(viewCountRepository.findViewCountByPostId(postId)).contains(0L);
    }

    @Test
    @DisplayName("초안 게시글은 조회 등록 대상에서 제외한다.")
    void excludesDraftFromRegistration() {
        // given
        Scenario scenario = scenario();
        long postId = postRepository.saveAndFlush(
                PostFixture.publicDraftRilogPost(scenario.blog(), scenario.writer())).getId();

        // when & then
        assertThatThrownBy(() -> registrationService.register(postId, null, ANONYMOUS_VIEWER))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("삭제한 게시글은 조회 등록 대상에서 제외한다.")
    void excludesDeletedPostFromRegistration() {
        // given
        Scenario scenario = scenario();
        long postId = publish(scenario);
        postService.deletePublishedPost(postId, scenario.writer().getId());

        // when & then
        assertThatThrownBy(() -> registrationService.register(postId, null, ANONYMOUS_VIEWER))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("존재하지 않는 게시글의 조회 등록은 거절한다.")
    void rejectsRegistrationForMissingPost() {
        // when & then
        assertThatThrownBy(() -> registrationService.register(999_999L, null, ANONYMOUS_VIEWER))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
    }

    private Scenario scenario() {
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("조회작성자", "view_writer"));
        Blog blog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, writer));
        return new Scenario(writer, blog);
    }

    private long publish(Scenario scenario) {
        return postService.publish(PostFixture.publicPostPublishCommand(scenario.blog().getSlug()),
                scenario.writer().getId()).postId();
    }

    private record Scenario(User writer, Blog blog) { }
}
