package kr.rilog.domain.post.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.rilog.domain.post.controller.dto.response.TheRilogResponse;
import kr.rilog.global.response.ApiResponse;

@Tag(name = "더 리로그 API")
public interface TheRilogApiSpec {

    @Operation(
            summary = "더 리로그 메인 조회 API",
            description = "인증이나 요청 파라미터 없이 최신 공개 뉴스 1개와 기업 최대 3개·개인 최대 2개의 스포트라이트를 조회합니다. "
                    + "뉴스 헤드라인은 본문 제목을 순서대로 제공하며 blockId는 포함하지 않습니다. "
                    + "date는 뉴스 발행일이며 뉴스가 없으면 스포트라이트의 최신 발행일입니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "더 리로그 메인 조회 성공",
            useReturnTypeSchema = true,
            content = @Content(
                    mediaType = "application/json",
                    examples = {
                            @ExampleObject(name = "콘텐츠가 있는 경우", value = """
                                    {
                                      "status": 200,
                                      "message": "더 리로그 메인 조회에 성공했습니다.",
                                      "data": {
                                        "blogSlug": "the_rilog",
                                        "date": "2026-09-30",
                                        "news": {
                                          "postId": 100,
                                          "slug": "the_rilog",
                                          "title": "오늘의 기술 뉴스",
                                          "publishedAt": "2026-09-30T06:00:00",
                                          "headlines": [{"title": "새로운 오픈소스 모델 공개"}]
                                        },
                                        "spotlights": [{
                                          "postId": 101,
                                          "slug": "the_rilog",
                                          "articleType": "enterprise",
                                          "title": "배포 과정 개선",
                                          "description": "기업 기술 블로그의 배포 경험을 전합니다.",
                                          "thumbnailImageUrl": "https://cdn.example.com/thumbnail.png",
                                          "publishedAt": "2026-09-28T06:00:00",
                                          "source": {
                                            "sourceProfileName": "기업 B",
                                            "sourceProfileImage": "https://cdn.example.com/company.png"
                                          }
                                        }]
                                      }
                                    }
                                    """),
                            @ExampleObject(name = "공개 콘텐츠가 없는 경우", value = """
                                    {
                                      "status": 200,
                                      "message": "더 리로그 메인 조회에 성공했습니다.",
                                      "data": {"blogSlug":"the_rilog","date":null,"news":null,"spotlights":[]}
                                    }
                                    """)
                    }
            )
    )
    ApiResponse<TheRilogResponse> getTheRilog();
}
