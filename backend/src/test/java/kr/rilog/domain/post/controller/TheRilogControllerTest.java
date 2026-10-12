package kr.rilog.domain.post.controller;

import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.service.TheRilogService;
import kr.rilog.domain.post.service.dto.result.TheRilogResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

class TheRilogControllerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final TheRilogService service = mock(TheRilogService.class);
    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new TheRilogController(service)).build();

    @Test
    @DisplayName("비로그인 사용자도 더 리로그 메인을 조회할 수 있다.")
    void anonymousUserCanReadTheRilog() throws Exception {
        // given
        when(service.readTheRilog()).thenReturn(new TheRilogResult("the_rilog", null, null, List.of()));

        // when
        var response = mockMvc.perform(get("/v1/the-rilog")).andReturn().getResponse();

        // then
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("더 리로그 메인 응답은 뉴스 제목 목록과 유형별 스포트라이트를 배열 하나로 제공한다.")
    void returnsNewsAndFlatSpotlightContract() throws Exception {
        // given
        var publishedAt = LocalDateTime.of(2026, 9, 26, 6, 0);
        when(service.readTheRilog()).thenReturn(new TheRilogResult(
                "the_rilog", LocalDate.of(2026, 9, 26),
                new TheRilogResult.NewsResult(10L, "오늘의 뉴스", publishedAt,
                        List.of(new TheRilogResult.HeadlineResult("AI 뉴스"))),
                List.of(
                        new TheRilogResult.SpotlightResult(20L, PostType.ENTERPRISE_SPOTLIGHT,
                                "기업 글", "기업 요약", "https://example.com/thumb.png", publishedAt,
                                new TheRilogResult.SourceResult("기업 B", "https://example.com/company.png")),
                        new TheRilogResult.SpotlightResult(21L, PostType.PERSONAL_SPOTLIGHT,
                                "개인 글", "개인 요약", null, publishedAt,
                                new TheRilogResult.SourceResult("개발자", null))
                )
        ));

        // when
        var response = mockMvc.perform(get("/v1/the-rilog")).andReturn().getResponse();

        // then
        assertThat(objectMapper.readTree(response.getContentAsString())).isEqualTo(objectMapper.readTree("""
                {
                  "status": 200,
                  "message": "더 리로그 메인 조회에 성공했습니다.",
                  "data": {
                    "blogSlug": "the_rilog",
                    "date": "2026-09-26",
                    "news": {
                      "postId": 10, "slug": "the_rilog", "title": "오늘의 뉴스", "publishedAt": "2026-09-26T06:00:00",
                      "headlines": [{"title": "AI 뉴스"}]
                    },
                    "spotlights": [
                      {
                        "postId": 20, "slug": "the_rilog", "articleType": "enterprise", "title": "기업 글",
                        "description": "기업 요약", "thumbnailImageUrl": "https://example.com/thumb.png",
                        "publishedAt": "2026-09-26T06:00:00",
                        "source": {"sourceProfileName": "기업 B", "sourceProfileImage": "https://example.com/company.png"}
                      },
                      {
                        "postId": 21, "slug": "the_rilog", "articleType": "personal", "title": "개인 글",
                        "description": "개인 요약", "thumbnailImageUrl": null,
                        "publishedAt": "2026-09-26T06:00:00",
                        "source": {"sourceProfileName": "개발자", "sourceProfileImage": null}
                      }
                    ]
                  }
                }
                """));
    }

    @Test
    @DisplayName("공개 콘텐츠가 없으면 더 리로그 메인은 빈 응답 계약을 유지한다.")
    void returnsEmptyContentContract() throws Exception {
        // given
        when(service.readTheRilog()).thenReturn(new TheRilogResult("the_rilog", null, null, List.of()));

        // when
        var response = mockMvc.perform(get("/v1/the-rilog")).andReturn().getResponse();

        // then
        assertThat(objectMapper.readTree(response.getContentAsString()).path("data"))
                .isEqualTo(objectMapper.readTree("""
                        {"blogSlug":"the_rilog","date":null,"news":null,"spotlights":[]}
                        """));
    }
}
