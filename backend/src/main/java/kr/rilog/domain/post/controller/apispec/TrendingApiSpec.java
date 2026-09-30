package kr.rilog.domain.post.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "트렌딩 피드 조회 API")
public interface TrendingApiSpec {

    @Operation(
            description = "개발자가 지정한 순서로 트렌딩 게시물 목록을 조회합니다.",
            summary = "트렌딩 피드 게시물 목록 조회 API"
    )
    ApiResponse<FullFeedPostResponse> readTrendingPosts(
            @Parameter(description = "게시글 카테고리", example = "TECH")
            @RequestParam(required = false) Category category,
            @Parameter(description = "게시 대상 블로그 유형", example = "COLOG")
            @RequestParam(required = false) BlogType blogType,
            @RequestParam int page,
            @RequestParam int size
    );
}
