package kr.rilog.domain.post.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.TeamFeedPostResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "피드 목록 조회 API")
public interface FeedApiSpec {

    @Operation(
            description = "전체 피드 게시물 목록 조회 API",
            summary = "전체 피드 게시물 목록 조회 API"
    )
    ApiResponse<FullFeedPostResponse> readFullFeedPosts(
            @RequestParam int page,
            @RequestParam int size
    );

    @Operation(
            description = "팀 피드 게시물 목록 조회 API",
            summary = "팀 피드 게시물 목록 조회 API"
    )
    ApiResponse<TeamFeedPostResponse> getTeamPosts(
            @PathVariable String cologSlug,
            @RequestParam int page,
            @RequestParam int size
    );

}
