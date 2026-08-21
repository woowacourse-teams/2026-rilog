package kr.rilog.domain.user.controller;

import kr.rilog.domain.user.service.UserQueryService;
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
    private UserQueryService userQueryService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        userQueryService = mock(UserQueryService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new UserController(userService, userQueryService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
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

    @Test
    @DisplayName("닉네임 요청 파라미터가 없으면 거절한다")
    void validateNicknameRejectsMissingParameter() throws Exception {
        mockMvc.perform(get("/v1/availability/nickname"))
                .andExpect(status().isBadRequest());

        verify(userService, never()).validateDuplicatedNickname(org.mockito.ArgumentMatchers.anyString());
    }

}
