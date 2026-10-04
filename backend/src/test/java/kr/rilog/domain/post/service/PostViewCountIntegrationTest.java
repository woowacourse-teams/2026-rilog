package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.controller.PostController;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.global.advice.GlobalExceptionHandler;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static kr.rilog.domain.post.entity.enums.PostStatus.DRAFT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
    @MockitoSpyBean
    private TagAssetsPublisher tagAssetsPublisher;

    @Test
    void publicationCreatesZeroCount() {
        Scenario scenario = scenario();
        long postId = publish(scenario);

        assertThat(count(postId)).isZero();
    }

    @Test
    void draftGetsCountOnlyWhenPublished() {
        Scenario scenario = scenario();
        long draftId = draftService.saveDraft(PostFixture.initialDraftSaveCommand(), scenario.writer().getId()).draftId();
        assertThat(jdbc.queryForObject("select count(*) from post_view_count", Long.class)).isZero();

        draftService.publishDraft(PostFixture.publicDraftPublishCommand(scenario.blog().getSlug()), draftId, scenario.writer().getId());

        assertThat(count(draftId)).isZero();
    }

    @Test
    void repeatedCanonicalGetReturnsStoredCountWithoutIncrementing() throws Exception {
        Scenario scenario = scenario();
        long postId = publish(scenario);
        jdbc.update("update post_view_count set view_count = 42 where post_id = ?", postId);
        var mvc = MockMvcBuilders.standaloneSetup(new PostController(postService))
                .setControllerAdvice(new GlobalExceptionHandler()).build();

        for (int i = 0; i < 3; i++) {
            mvc.perform(get("/v1/blogs/{slug}/posts/{postId}", scenario.blog().getSlug(), postId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.viewCount").value(42));
        }
        assertThat(count(postId)).isEqualTo(42);
        assertThat(jdbc.queryForObject("select count(*) from post_view_count", Long.class)).isEqualTo(1);
    }

    @Test
    void missingCountIsAnErrorInsteadOfZero() throws Exception {
        Scenario scenario = scenario();
        long postId = publish(scenario);
        jdbc.update("delete from post_view_count where post_id = ?", postId);
        var mvc = MockMvcBuilders.standaloneSetup(new PostController(postService))
                .setControllerAdvice(new GlobalExceptionHandler()).build();

        mvc.perform(get("/v1/blogs/{slug}/posts/{postId}", scenario.blog().getSlug(), postId))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void publicationFailureRollsBackPostAndCount() {
        Scenario scenario = scenario();
        doThrow(new IllegalStateException("publication failed")).when(tagAssetsPublisher).attach(any());

        assertThatThrownBy(() -> publish(scenario)).isInstanceOf(IllegalStateException.class);

        assertThat(postRepository.findAll()).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from post_view_count", Long.class)).isZero();
    }

    @Test
    void draftPublicationFailureRollsBackStatusAndCount() {
        Scenario scenario = scenario();
        long draftId = draftService.saveDraft(PostFixture.initialDraftSaveCommand(), scenario.writer().getId()).draftId();
        doThrow(new IllegalStateException("publication failed")).when(tagAssetsPublisher).synchronize(any(), any(), any());

        assertThatThrownBy(() -> draftService.publishDraft(
                PostFixture.publicDraftPublishCommand(scenario.blog().getSlug()), draftId, scenario.writer().getId()
        )).isInstanceOf(IllegalStateException.class);

        assertThat(postRepository.findById(draftId).orElseThrow().getStatus()).isEqualTo(DRAFT);
        assertThat(jdbc.queryForObject("select count(*) from post_view_count", Long.class)).isZero();
    }

    @Test
    void privateWriterCanReadCountButAnonymousCannot() {
        Scenario scenario = scenario();
        long postId = publish(scenario);
        jdbc.update("update post set visibility = 'PRIVATE' where id = ?", postId);
        jdbc.update("update post_view_count set view_count = 17 where post_id = ?", postId);

        assertThatThrownBy(() -> postService.readPostDetailByCanonicalPath(scenario.blog().getSlug(), postId, null))
                .isInstanceOf(PostException.class);
        var response = postService.readEditablePostDetail(postId, scenario.writer().getId());
        assertThat(response.viewCount()).isEqualTo(17);
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

    private record Scenario(User writer, Blog blog) {
    }
}
