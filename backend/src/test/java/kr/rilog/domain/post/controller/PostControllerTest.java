package kr.rilog.domain.post.controller;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.auth.resolver.NullableLoginUserIdArgumentResolver;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.owner.CologOwnerResponse;
import kr.rilog.domain.post.controller.dto.response.owner.RilogOwnerResponse;
import kr.rilog.domain.post.service.PostCommandService;
import kr.rilog.domain.post.service.PostQueryService;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.global.advice.GlobalExceptionHandler;
import kr.rilog.global.idempotency.CompletedRequestStore;
import kr.rilog.global.idempotency.IdempotentRequestAspect;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PostControllerTest {

    private final PostCommandService postCommandService = mock(PostCommandService.class);
    private final PostQueryService postQueryService = mock(PostQueryService.class);

    private static final Long POST_ID = 1L;
    private static final String BLOG_SLUG = "writer";

    @Test
    @DisplayName("게시글 발행은 request body의 slug를 발행 대상 블로그 slug로 전달한다")
    void createPassesSlugFromRequestBody() throws Exception {
        // given
        when(postCommandService.publish(any(PostSaveCommand.class), eq(7L)))
                .thenReturn(new PostPublishResult(31L, BLOG_SLUG));
        MockMvc mockMvc = mockMvc();

        // when - then
        mockMvc.perform(post("/v1/posts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "writer",
                                  "title": "BlockNote 도입기",
                                  "content": [],
                                  "category": "TECH",
                                  "visibility": "PUBLIC",
                                  "thumbnailImageUrl": null,
                                  "profileImageUrl": null
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.data.postId").value(31))
                .andExpect(jsonPath("$.data.slug").value(BLOG_SLUG));

        ArgumentCaptor<PostSaveCommand> commandCaptor = ArgumentCaptor.forClass(PostSaveCommand.class);
        verify(postCommandService).publish(commandCaptor.capture(), eq(7L));
        assertThat(commandCaptor.getValue().slug()).isEqualTo(BLOG_SLUG);
    }

    @Test
    @DisplayName("같은 멱등키로 게시글 발행을 다시 요청하면 한 번만 발행하고 같은 응답을 반환한다")
    void createPublishesOnceForSameIdempotencyKey() throws Exception {
        // given
        when(postCommandService.publish(any(PostSaveCommand.class), eq(7L)))
                .thenReturn(new PostPublishResult(31L, BLOG_SLUG))
                .thenReturn(new PostPublishResult(32L, BLOG_SLUG));
        MockMvc mockMvc = idempotentMockMvc();
        String idempotencyKey = UUID.randomUUID().toString();

        // when - then
        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(post("/v1/posts")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                            .header("Idempotency-Key", idempotencyKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "slug": "writer",
                                      "title": "BlockNote 도입기",
                                      "content": [],
                                      "category": "TECH",
                                      "visibility": "PUBLIC",
                                      "thumbnailImageUrl": null,
                                      "profileImageUrl": null
                                    }
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.postId").value(31));
        }

        verify(postCommandService).publish(any(PostSaveCommand.class), eq(7L));
    }

    @Test
    @DisplayName("멱등키 헤더가 UUID 형식이 아니면 발행하지 않고 400으로 응답한다")
    void createRejectsInvalidIdempotencyKey() throws Exception {
        // given
        MockMvc mockMvc = idempotentMockMvc();

        // when - then
        mockMvc.perform(post("/v1/posts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .header("Idempotency-Key", "not-a-uuid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "writer",
                                  "title": "BlockNote 도입기",
                                  "content": [],
                                  "category": "TECH",
                                  "visibility": "PUBLIC",
                                  "thumbnailImageUrl": null,
                                  "profileImageUrl": null
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_IDEMPOTENCY_KEY"));

        verifyNoInteractions(postCommandService);
    }

    @Test
    @DisplayName("멱등키가 아닌 값의 타입 변환 실패는 기존처럼 서버 오류로 응답한다")
    void otherTypeMismatchKeepsInternalServerError() throws Exception {
        // given
        MockMvc mockMvc = mockMvc();

        // when - then
        mockMvc.perform(get("/v1/posts/{postId}", "not-a-number")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("INTERNAL_SERVER_ERROR"));

        verifyNoInteractions(postQueryService);
    }

    @Test
    @DisplayName("블로그 게시글 상세 조회는 slug와 postId로 로그인하지 않아도 가능하다.")
    void getPostDetailsByCanonicalPathAllowsAnonymousUser() throws Exception {
        // given
        when(postQueryService.readPostDetailByCanonicalPath(BLOG_SLUG, POST_ID, null)).thenReturn(anonymousResponse());
        MockMvc mockMvc = mockMvc();
        JsonMapper mapper = JsonMapper.builder().build();

        // when
        var response = mockMvc.perform(get("/v1/blogs/{slug}/posts/{postId}", BLOG_SLUG, POST_ID))
                .andReturn().getResponse();

        // then
        JsonNode body = mapper.readTree(response.getContentAsString());
        assertSoftly(softly -> {
            softly.assertThat(response.getStatus()).isEqualTo(200);
            softly.assertThat(body.path("status").asInt()).isEqualTo(200);
            softly.assertThat(mapper.treeToValue(body.at("/data/chapter"), ChapterResponse.class))
                    .isEqualTo(new ChapterResponse(12L, "Spring", 0));
            softly.assertThat(body.at("/data/owner/type").asText()).isEqualTo("RILOG");
            softly.assertThat(body.at("/data/viewCount").isNull()).isTrue();
            softly.assertThat(mapper.treeToValue(body.at("/data/viewerPermissions"), PostDetailResponse.ViewerPermissionsResponse.class))
                    .isEqualTo(PostDetailResponse.ViewerPermissionsResponse.none());
        });
        verify(postQueryService).readPostDetailByCanonicalPath(BLOG_SLUG, POST_ID, null);
    }

    @Test
    @DisplayName("팀 블로그 게시글 상세 응답은 집계 필드 없이 블로그 프로필을 반환한다.")
    void getPostDetailsByCanonicalPathSerializesCologOwnerProfile() throws Exception {
        // given
        String cologSlug = "team_blog";
        PostDetailResponse post = anonymousResponse();
        PostDetailResponse cologPost = new PostDetailResponse(
                post.title(), post.content(), post.publishedAt(), post.thumbnailImageUrl(), post.category(),
                post.chapter(), post.author(),
                new CologOwnerResponse(
                        BlogType.COLOG, 4L, cologSlug, "리로그",
                        "https://example.com/profile.png", "https://example.com/cover.png"
                ),
                post.viewerPermissions(), post.viewCount()
        );
        when(postQueryService.readPostDetailByCanonicalPath(cologSlug, POST_ID, null)).thenReturn(cologPost);

        // when
        var response = mockMvc().perform(get("/v1/blogs/{slug}/posts/{postId}", cologSlug, POST_ID));

        // then
        response.andExpect(status().isOk())
                .andExpect(jsonPath("$.data.owner.type").value("COLOG"))
                .andExpect(jsonPath("$.data.owner.blogId").value(4))
                .andExpect(jsonPath("$.data.owner.slug").value(cologSlug))
                .andExpect(jsonPath("$.data.owner.name").value("리로그"))
                .andExpect(jsonPath("$.data.owner.profileImageUrl").value("https://example.com/profile.png"))
                .andExpect(jsonPath("$.data.owner.coverImageUrl").value("https://example.com/cover.png"))
                .andExpect(jsonPath("$.data.owner.memberCount").doesNotHaveJsonPath())
                .andExpect(jsonPath("$.data.owner.postCount").doesNotHaveJsonPath());
    }

    @Test
    @DisplayName("미분류 게시글 상세 조회 응답은 chapter를 null로 반환한다.")
    void getPostDetailsByCanonicalPathReturnsNullChapterForUnclassifiedPost() throws Exception {
        // given
        when(postQueryService.readPostDetailByCanonicalPath(BLOG_SLUG, POST_ID, null)).thenReturn(responseWithoutChapter());
        MockMvc mockMvc = mockMvc();

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}/posts/{postId}", BLOG_SLUG, POST_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.chapter").value(nullValue()));
    }

    @Test
    @DisplayName("블로그 게시글 상세 조회에 Access Token이 있으면 로그인 사용자 ID를 전달한다")
    void getPostDetailsByCanonicalPathPassesRequesterIdWhenAccessTokenExists() throws Exception {
        // given
        when(postQueryService.readPostDetailByCanonicalPath(BLOG_SLUG, POST_ID, 7L)).thenReturn(response());
        MockMvc mockMvc = mockMvc();

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}/posts/{postId}", BLOG_SLUG, POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200));

        verify(postQueryService).readPostDetailByCanonicalPath(BLOG_SLUG, POST_ID, 7L);
    }

    @Test
    @DisplayName("블로그 게시글 상세 조회에 잘못된 Authorization 헤더가 있으면 요청을 거부한다")
    void getPostDetailsByCanonicalPathRejectsInvalidAuthorizationHeader() throws Exception {
        // given
        MockMvc mockMvc = mockMvc();

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}/posts/{postId}", BLOG_SLUG, POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Basic access-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_AUTHORIZATION_HEADER"));

        verifyNoInteractions(postQueryService);
    }

    @Test
    @DisplayName("게시글 수정 초기 데이터 조회는 로그인 사용자 ID로 조회한다")
    void getEditablePostDetailsPassesRequesterId() throws Exception {
        // given
        when(postQueryService.readEditablePostDetail(POST_ID, 7L)).thenReturn(response());
        MockMvc mockMvc = mockMvc();

        // when - then
        mockMvc.perform(get("/v1/posts/{postId}", POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200));

        verify(postQueryService).readEditablePostDetail(POST_ID, 7L);
    }

    private MockMvc mockMvc() {
        return mockMvcFor(new PostController(postCommandService, postQueryService));
    }

    private MockMvc idempotentMockMvc() {
        AspectJProxyFactory factory = new AspectJProxyFactory(new PostController(postCommandService, postQueryService));
        factory.setProxyTargetClass(true);
        factory.addAspect(new IdempotentRequestAspect(new CompletedRequestStore()));
        PostController controller = factory.getProxy();
        return mockMvcFor(controller);
    }

    private MockMvc mockMvcFor(PostController controller) {
        return MockMvcBuilders.standaloneSetup(controller)
                .addInterceptors(new BearerAuthenticationInterceptor(
                        new FixedAccessTokenProvider(),
                        mock(OnboardingTokenProvider.class)
                ))
                .setCustomArgumentResolvers(
                        new LoginUserIdArgumentResolver(),
                        new NullableLoginUserIdArgumentResolver()
                )
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private PostDetailResponse response() {
        return new PostDetailResponse(
                "게시글 제목",
                null,
                null,
                "https://example.com/thumbnail.png",
                "기술",
                new ChapterResponse(12L, "Spring", 0),
                new PostDetailResponse.AuthorResponse(
                        "작성자",
                        7L,
                        "writer",
                        "https://example.com/profile.png"
                ),
                new RilogOwnerResponse(
                        BlogType.RILOG,
                        1L,
                        BLOG_SLUG,
                        "작성자 블로그",
                        "https://example.com/profile.png"
                ),
                PostDetailResponse.ViewerPermissionsResponse.none(),
                42L
        );
    }

    private PostDetailResponse responseWithoutChapter() {
        PostDetailResponse response = response();
        return new PostDetailResponse(
                response.title(),
                response.content(),
                response.publishedAt(),
                response.thumbnailImageUrl(),
                response.category(),
                null,
                response.author(),
                response.owner(),
                response.viewerPermissions(),
                response.viewCount()
        );
    }

    private PostDetailResponse anonymousResponse() {
        PostDetailResponse result = response();
        return new PostDetailResponse(result.title(), result.content(), result.publishedAt(),
                result.thumbnailImageUrl(), result.category(), result.chapter(), result.author(), result.owner(),
                result.viewerPermissions(), null);
    }

    private static class FixedAccessTokenProvider implements AccessTokenProvider {

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            throw new UnsupportedOperationException();
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            return AccessTokenClaims.of(
                    7L,
                    GlobalRole.USER,
                    "writer",
                    Instant.parse("2026-08-13T00:00:00Z"),
                    Instant.parse("2026-08-13T00:15:00Z")
            );
        }
    }
}
