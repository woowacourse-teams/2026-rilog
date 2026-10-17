package kr.rilog.domain.post.controller;

import jakarta.servlet.http.Cookie;
import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.service.PostService;
import kr.rilog.domain.post.view.ViewerCookieResolver;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = "post.view.registration.enabled=true")
class PostViewWebIntegrationTest extends ServiceSupport {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository users;
    @Autowired private BlogRepository blogs;
    @Autowired private BlogMemberRepository members;
    @Autowired private PostService posts;
    @Autowired private PostViewCountRepository counts;
    @Autowired private AccessTokenProvider tokens;
    private final JsonMapper objectMapper = JsonMapper.builder().build();

    private MockMvc mvc;
    private long postId;
    private String detail;
    private String authorToken;

    @BeforeEach
    void setUp() {
        var writer = users.saveAndFlush(UserFixture.completedWithNicknameAndSlug("글작성자", "http_writer"));
        var blog = blogs.saveAndFlush(Blog.createRilog(writer));
        members.saveAndFlush(BlogMemberFixture.owner(blog, writer));
        postId = posts.publish(PostFixture.publicPostPublishCommand(blog.getSlug()), writer.getId()).postId();
        authorToken = tokens.issue(writer.getId(), GlobalRole.USER, writer.getSlug()).value();
        detail = "/v1/blogs/" + blog.getSlug() + "/posts/" + postId;
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    @Test
    @DisplayName("비회원 조회 등록은 본문 없는 204와 새 방문자 쿠키를 반환한다.")
    void anonymousRegistrationIssuesCookieWithoutBody() throws Exception {
        // when
        var response = mvc.perform(post("/v1/posts/{postId}/views", postId)).andReturn().getResponse();

        // then
        assertThat(response.getStatus()).isEqualTo(204);
        assertThat(response.getContentAsString()).isEmpty();
        assertThat(response.getHeader("Set-Cookie")).startsWith(ViewerCookieResolver.COOKIE_NAME + "=");
    }

    @Test
    @DisplayName("기존 방문자 쿠키로 중복 등록해도 작성자는 DB 저장 전 조회수 한 건을 확인한다.")
    void repeatedVisitorAppearsOnceInAuthorDetailBeforeFlush() throws Exception {
        // given
        Cookie visitor = new Cookie(ViewerCookieResolver.COOKIE_NAME, "2dfd630c-698a-499f-960b-842626fc0387");
        mvc.perform(post("/v1/posts/{postId}/views", postId).cookie(visitor));

        // when
        var registration = mvc.perform(post("/v1/posts/{postId}/views", postId).cookie(visitor))
                .andReturn().getResponse();
        var response = mvc.perform(get(detail).header("Authorization", "Bearer " + authorToken))
                .andReturn().getResponse();

        // then
        var body = objectMapper.readTree(response.getContentAsString());
        assertSoftly(softly -> {
            softly.assertThat(registration.getStatus()).isEqualTo(204);
            softly.assertThat(response.getStatus()).isEqualTo(200);
            softly.assertThat(body.at("/data/viewCount").isIntegralNumber()).isTrue();
            softly.assertThat(body.at("/data/viewCount").longValue()).isEqualTo(1L);
            softly.assertThat(counts.findViewCountByPostId(postId)).contains(0L);
        });
    }

    @Test
    @DisplayName("작성자 토큰으로 조회 등록하면 쿠키 발급과 집계 없이 본문 없는 204를 반환한다.")
    void authenticatedAuthorIsExcludedAtHttpBoundary() throws Exception {
        // when
        var response = mvc.perform(post("/v1/posts/{postId}/views", postId)
                        .header("Authorization", "Bearer " + authorToken))
                .andReturn().getResponse();
        var detailResponse = mvc.perform(get(detail).header("Authorization", "Bearer " + authorToken))
                .andReturn().getResponse();

        // then
        var body = objectMapper.readTree(detailResponse.getContentAsString());
        assertSoftly(softly -> {
            softly.assertThat(response.getStatus()).isEqualTo(204);
            softly.assertThat(response.getContentAsByteArray()).isEmpty();
            softly.assertThat(response.getHeader("Set-Cookie")).isNull();
            softly.assertThat(detailResponse.getStatus()).isEqualTo(200);
            softly.assertThat(body.at("/data/viewCount").isIntegralNumber()).isTrue();
            softly.assertThat(body.at("/data/viewCount").longValue()).isZero();
        });
    }

    @Test
    @DisplayName("익명 상세 조회는 조회수를 숨긴다.")
    void anonymousDetailHidesCount() throws Exception {
        // when
        var response = mvc.perform(get(detail)).andReturn().getResponse();

        // then
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(objectMapper.readTree(response.getContentAsString()).at("/data/viewCount").isNull()).isTrue();
    }
}
