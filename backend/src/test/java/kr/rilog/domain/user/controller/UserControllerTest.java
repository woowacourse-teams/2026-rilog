package kr.rilog.domain.user.controller;

import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.service.UserService;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static kr.rilog.domain.user.exception.UserErrorInformation.NICKNAME_DUPLICATED;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest {

    private UserService userService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new UserController(userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"러로", "12345678901234567890"})
    @DisplayName("2자 이상 20자 이하의 닉네임은 사용 가능 여부를 확인한다")
    void validateNicknameAcceptsBoundaryLength(String nickname) throws Exception {
        mockMvc.perform(get("/v1/availability/nickname")
                        .param("nickname", nickname))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("사용가능한 닉네임입니다."));

        verify(userService).validateDuplicatedNickname(nickname);
    }

    @ParameterizedTest
    @ValueSource(strings = {"러", "123456789012345678901"})
    @DisplayName("2자 미만이거나 20자를 초과한 닉네임은 거절한다")
    void validateNicknameRejectsInvalidLength(String nickname) throws Exception {
        mockMvc.perform(get("/v1/availability/nickname")
                        .param("nickname", nickname))
                .andExpect(status().isBadRequest());

        verify(userService, never()).validateDuplicatedNickname(nickname);
    }

    @Test
    @DisplayName("중복된 닉네임이면 중복 오류를 반환한다")
    void validateNicknameRejectsDuplicatedNickname() throws Exception {
        String nickname = "러로";
        doThrow(new UserException(NICKNAME_DUPLICATED))
                .when(userService).validateDuplicatedNickname(nickname);

        mockMvc.perform(get("/v1/availability/nickname")
                        .param("nickname", nickname))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NICKNAME_DUPLICATED"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Ab1_", "12345678901234567890", "ri-log_01"})
    @DisplayName("4자 이상 20자 이하이고 허용 문자로 구성된 슬러그는 사용 가능 여부를 확인한다")
    void validateSlugAcceptsValidSlug(String slug) throws Exception {
        mockMvc.perform(get("/v1/availability/slug")
                        .param("slug", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("사용가능한 슬러그입니다."));

        verify(userService).validateDuplicatedSlug(slug);
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "123456789012345678901"})
    @DisplayName("4자 미만이거나 20자를 초과한 슬러그는 거절한다")
    void validateSlugRejectsInvalidLength(String slug) throws Exception {
        mockMvc.perform(get("/v1/availability/slug")
                        .param("slug", slug))
                .andExpect(status().isBadRequest());

        verify(userService, never()).validateDuplicatedSlug(slug);
    }

    @ParameterizedTest
    @ValueSource(strings = {"리로그1", "ri log", "ri.log", "rilog!"})
    @DisplayName("영문, 숫자, 하이픈, 언더스코어 이외의 문자가 포함된 슬러그는 거절한다")
    void validateSlugRejectsUnsupportedCharacters(String slug) throws Exception {
        mockMvc.perform(get("/v1/availability/slug")
                        .param("slug", slug))
                .andExpect(status().isBadRequest());

        verify(userService, never()).validateDuplicatedSlug(slug);
    }

    @Test
    @DisplayName("중복된 슬러그이면 중복 오류를 반환한다")
    void validateSlugRejectsDuplicatedSlug() throws Exception {
        String slug = "ri_log-01";
        doThrow(new UserException(NICKNAME_DUPLICATED))
                .when(userService).validateDuplicatedSlug(slug);

        mockMvc.perform(get("/v1/availability/slug")
                        .param("slug", slug))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NICKNAME_DUPLICATED"));
    }

    @Test
    @DisplayName("닉네임 요청 파라미터가 없으면 거절한다")
    void validateNicknameRejectsMissingParameter() throws Exception {
        mockMvc.perform(get("/v1/availability/nickname"))
                .andExpect(status().isBadRequest());

        verify(userService, never()).validateDuplicatedNickname(org.mockito.ArgumentMatchers.anyString());
    }
}
