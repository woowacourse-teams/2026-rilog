package kr.rilog.domain.blog.controller;

import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.blog.service.CologService;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.blog.service.dto.command.CologMemberInviteCommand;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CologControllerTest {

    @Test
    @DisplayName("공개 블로그 프로필 조회 경로는 팀 컨트롤러에서 제공하지 않는다")
    void publicBlogProfilePathIsNotProvidedByCologController() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new CologController(cologService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/blogs/@{slug}", "rilog-team"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("이전 공개 프로필 조회 경로는 제공하지 않는다")
    void oldPublicProfilePathIsRemoved() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new CologController(cologService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/@{slug}", "rilog-team"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("기존 팀 상세 조회 경로는 제공하지 않는다")
    void getDetailPathIsRemoved() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new CologController(cologService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/cologs/{slug}", "rilog-team"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("기존 팀 프로필 조회 경로는 제공하지 않는다")
    void getProfilePathIsRemoved() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new CologController(cologService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/cologs/{slug}/profile", "rilog-team"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /v1/cologs는 로그인 사용자의 팀을 생성한다")
    void createCreatesCologForLoginUser() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        CologCreateCommand command = new CologCreateCommand(
                "리로그 팀",
                "rilog-team",
                "함께 쓰는 기술 블로그",
                "https://example.com/logo.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog",
                "test@test.com"
        );
        when(cologService.create(1L, command))
                .thenReturn(new CologCreateResult(2L, "리로그 팀", "rilog-team"));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new CologController(cologService))
                .setCustomArgumentResolvers(new FixedLoginUserIdArgumentResolver(1L))
                .build();

        // when - then
        mockMvc.perform(post("/v1/cologs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "리로그 팀",
                                  "slug": "rilog-team",
                                  "introduction": "함께 쓰는 기술 블로그",
                                  "profileImageUrl": "https://example.com/logo.png",
                                  "coverImageUrl": "https://example.com/cover.png",
                                  "serviceUrl": "https://rilog.example.com",
                                  "githubUrl": "https://github.com/rilog",
                                  "email": "test@test.com"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(2L))
                .andExpect(jsonPath("$.data.name").value("리로그 팀"))
                .andExpect(jsonPath("$.data.slug").value("rilog-team"));

        verify(cologService).create(1L, command);
    }

    @Test
    @DisplayName("GET /v1/users/me/cologs/overview는 인증된 사용자의 팀 목록과 챕터를 조회한다")
    void getMyCologsOverviewReturnsAuthenticatedUsersCologsWithChapters() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        when(cologService.getMyCologsOverview(7L))
                .thenReturn(List.of(new MyCologResponse(
                        1L,
                        "rilog-team",
                        "리로그 팀",
                        "https://example.com/logo.png",
                        List.of(new ChapterResponse(10L, "Spring", 0))
                )));
        MockMvc mockMvc = mockMvc(cologService);

        // when - then
        mockMvc.perform(get("/v1/users/me/cologs/overview")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].cologId").value(1L))
                .andExpect(jsonPath("$.data[0].slug").value("rilog-team"))
                .andExpect(jsonPath("$.data[0].name").value("리로그 팀"))
                .andExpect(jsonPath("$.data[0].profileImageUrl").value("https://example.com/logo.png"))
                .andExpect(jsonPath("$.data[0].chapters[0].chapterId").value(10L))
                .andExpect(jsonPath("$.data[0].chapters[0].name").value("Spring"))
                .andExpect(jsonPath("$.data[0].chapters[0].order").value(0));

        verify(cologService).getMyCologsOverview(7L);
    }

    @Test
    @DisplayName("POST /v1/cologs/{slug}/members는 로그인 사용자의 팀 멤버 초대를 처리한다")
    void inviteMemberInvitesCologMemberForLoginUser() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        CologMemberInviteCommand command = new CologMemberInviteCommand(10L, BlogPermission.MEMBER, "Backend");
        when(cologService.inviteMember(1L, "rilog-team", command))
                .thenReturn(new CologMemberInviteResult(3L, 10L, BlogPermission.MEMBER, "Backend"));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new CologController(cologService))
                .setCustomArgumentResolvers(new FixedLoginUserIdArgumentResolver(1L))
                .build();

        // when - then
        mockMvc.perform(post("/v1/cologs/{slug}/members", "rilog-team")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userId": 10,
                                  "permission": "MEMBER",
                                  "blogRole": "Backend"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(3L))
                .andExpect(jsonPath("$.data.userId").value(10L))
                .andExpect(jsonPath("$.data.permission").value("MEMBER"))
                .andExpect(jsonPath("$.data.blogRole").value("Backend"));

        verify(cologService).inviteMember(1L, "rilog-team", command);
    }

    @Test
    @DisplayName("DELETE /v1/cologs/{slug}/members/me는 로그인 사용자의 팀 탈퇴를 처리한다")
    void leaveCologRemovesLoginUserFromColog() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        MockMvc mockMvc = mockMvc(cologService);

        // when - then
        mockMvc.perform(delete("/v1/cologs/{slug}/members/me", "rilog-team")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(204))
                .andExpect(jsonPath("$.message").value("팀 블로그에서 탈퇴했습니다."));

        verify(cologService).leaveColog(7L, "rilog-team");
    }

    @Test
    @DisplayName("DELETE /v1/cologs/{slug}/members/{memberId}는 팀 멤버 내보내기를 처리한다")
    void removeMemberRemovesTargetMemberFromColog() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        MockMvc mockMvc = mockMvc(cologService);

        // when - then
        mockMvc.perform(delete("/v1/cologs/{slug}/members/{memberId}", "rilog-team", 3L)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(204))
                .andExpect(jsonPath("$.message").value("팀 멤버를 내보냈습니다."));

        verify(cologService).removeMember(7L, "rilog-team", 3L);
    }

    @Test
    @DisplayName("DELETE /v1/cologs/{slug}는 로그인 사용자의 팀 블로그 삭제를 처리한다")
    void deleteCologDeletesAuthenticatedUsersColog() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        MockMvc mockMvc = mockMvc(cologService);

        // when - then
        mockMvc.perform(delete("/v1/cologs/{slug}", "rilog-team")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(204))
                .andExpect(jsonPath("$.message").value("팀 블로그를 삭제했습니다."));

        verify(cologService).deleteColog(7L, "rilog-team");
    }

    private MockMvc mockMvc(CologService cologService) {
        return MockMvcBuilders.standaloneSetup(new CologController(cologService))
                .setCustomArgumentResolvers(new FixedLoginUserIdArgumentResolver(7L))
                .build();
    }

    private record FixedLoginUserIdArgumentResolver(Long userId) implements HandlerMethodArgumentResolver {

        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.hasParameterAnnotation(LoginUserId.class);
        }

        @Override
        public Object resolveArgument(
                MethodParameter parameter,
                ModelAndViewContainer mavContainer,
                NativeWebRequest webRequest,
                WebDataBinderFactory binderFactory
        ) {
            return userId;
        }
    }
}
