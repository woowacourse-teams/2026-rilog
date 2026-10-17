package kr.rilog.domain.post.view;

import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_REGISTRATION_DISABLED;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
class PostViewDisabledWebIntegrationTest extends ServiceSupport {

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private PostViewCounterRegistry registry;

    @Test
    @DisplayName("기본 설정의 조회 등록은 쿠키와 카운터 생성 없이 503을 반환한다.")
    void disabledRegistrationReturnsUnavailableWithoutCookieOrCounter() throws Exception {
        // given
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();

        // when
        var response = mvc.perform(post("/v1/posts/999999/views")).andReturn().getResponse();

        // then
        var body = JsonMapper.builder().build().readTree(response.getContentAsString());
        assertSoftly(softly -> {
            softly.assertThat(response.getStatus()).isEqualTo(503);
            softly.assertThat(body.path("message").stringValue()).isEqualTo(POST_VIEW_REGISTRATION_DISABLED.getMessage());
            softly.assertThat(response.getHeader("Set-Cookie")).isNull();
            softly.assertThat(registry.snapshot()).isEmpty();
        });
    }
}
