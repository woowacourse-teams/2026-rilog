package kr.rilog.domain.post.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.PublicBlogFeedPostResponse;
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
            description = "공개 블로그 게시글 목록 조회 API입니다. @slug 경로로 개인/팀 블로그 게시글 목록을 조회합니다.",
            summary = "공개 블로그 게시글 목록 조회 API"
    )
    ApiResponse<PublicBlogFeedPostResponse> getPublicBlogPosts(
            @Parameter(description = "공개 블로그 slug", example = "rilog-team")
            @PathVariable String slug,
            @RequestParam int page,
            @RequestParam int size
    );

}
