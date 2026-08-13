package kr.rilog.domain.blog.controller;

import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.service.CologService;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CologControllerTest {

    @Test
    @DisplayName("POST /v1/cologs는 로그인 사용자의 팀을 생성한다")
    void createCreatesCologForLoginUser() throws Exception {
        // given
        CologService cologService = mock(CologService.class);
        CologCreateCommand command = new CologCreateCommand(
                "리로그 팀",
                "rilog-team",
                "함께 쓰는 기술 블로그",
                "https://example.com/cover.png",
                "https://rilog.example.com"
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
                                  "coverImageUrl": "https://example.com/cover.png",
                                  "serviceUrl": "https://rilog.example.com"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(2L))
                .andExpect(jsonPath("$.data.name").value("리로그 팀"))
                .andExpect(jsonPath("$.data.slug").value("rilog-team"));

        verify(cologService).create(1L, command);
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
