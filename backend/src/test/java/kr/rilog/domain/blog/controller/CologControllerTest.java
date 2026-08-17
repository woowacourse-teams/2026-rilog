package kr.rilog.domain.blog.controller;

import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.service.CologService;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.blog.service.dto.command.CologMemberInviteCommand;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.domain.blog.service.dto.result.CologPublicProfileResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CologControllerTest {

    @Test
    @DisplayName("GET /v1/blogs/{slug}는 팀 공개 프로필 정보를 조회한다")
    void getPublicProfileReturnsCologProfile() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        when(cologService.getPublicProfile("rilog-team"))
                .thenReturn(new CologPublicProfileResult(
                        2L,
                        "리로그 팀",
                        "rilog-team",
                        "함께 쓰는 기술 블로그",
                        "https://example.com/logo.png",
                        "https://example.com/cover.png",
                        "https://rilog.example.com",
                        "https://github.com/rilog",
                        10L,
                        24L
                ));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new CologController(cologService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}", "rilog-team"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("COLOG"))
                .andExpect(jsonPath("$.data.id").value(2L))
                .andExpect(jsonPath("$.data.name").value("리로그 팀"))
                .andExpect(jsonPath("$.data.slug").value("rilog-team"))
                .andExpect(jsonPath("$.data.introduction").value("함께 쓰는 기술 블로그"))
                .andExpect(jsonPath("$.data.logoUrl").value("https://example.com/logo.png"))
                .andExpect(jsonPath("$.data.coverImageUrl").value("https://example.com/cover.png"))
                .andExpect(jsonPath("$.data.serviceUrl").value("https://rilog.example.com"))
                .andExpect(jsonPath("$.data.githubUrl").value("https://github.com/rilog"))
                .andExpect(jsonPath("$.data.memberCount").value(10L))
                .andExpect(jsonPath("$.data.postCount").value(24L))
                .andExpect(jsonPath("$.data.user").doesNotExist());

        verify(cologService).getPublicProfile("rilog-team");
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
                .andExpect(status().isNotFound());
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
                "https://github.com/rilog"
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
                                  "logoUrl": "https://example.com/logo.png",
                                  "coverImageUrl": "https://example.com/cover.png",
                                  "serviceUrl": "https://rilog.example.com",
                                  "githubUrl": "https://github.com/rilog"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(2L))
                .andExpect(jsonPath("$.data.name").value("리로그 팀"))
                .andExpect(jsonPath("$.data.slug").value("rilog-team"));

        verify(cologService).create(1L, command);
    }

    @Test
    @DisplayName("POST /v1/cologs/{cologId}/members는 로그인 사용자의 팀 멤버 초대를 처리한다")
    void inviteMemberInvitesCologMemberForLoginUser() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        CologMemberInviteCommand command = new CologMemberInviteCommand(10L, BlogPermission.MEMBER, "Backend");
        when(cologService.inviteMember(1L, 2L, command))
                .thenReturn(new CologMemberInviteResult(3L, 10L, BlogPermission.MEMBER, "Backend"));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new CologController(cologService))
                .setCustomArgumentResolvers(new FixedLoginUserIdArgumentResolver(1L))
                .build();

        // when - then
        mockMvc.perform(post("/v1/cologs/{cologId}/members", 2L)
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

        verify(cologService).inviteMember(1L, 2L, command);
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
