package kr.rilog.domain.blog.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.rilog.domain.blog.controller.dto.response.BlogMemberResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@Tag(name = "팀 블로그 멤버 API")
public interface BlogMemberApiSpec {

    @Operation(
            summary = "팀 멤버 목록 조회 API",
            description = "팀 블로그 slug로 활동 중인 팀 멤버 목록을 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "팀 멤버 목록 조회 성공"
    )
    ApiResponse<List<BlogMemberResponse>> getCologMembers(@PathVariable("slug") String slug);

}
