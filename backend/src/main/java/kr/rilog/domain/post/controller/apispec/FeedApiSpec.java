package kr.rilog.domain.post.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.PublicBlogFeedPostResponse;
import kr.rilog.domain.post.entity.enums.Category;
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
            description = "블로그 유형과 로그인 사용자에 맞는 게시글을 조회합니다. category와 chapterId를 선택적으로 적용할 수 있으며, Rilog에서는 targetCologSlug로 특정 Colog에 작성한 글을 조회할 수 있습니다. targetCologSlug와 chapterId는 함께 사용할 수 없습니다.",
            summary = "블로그 게시글 목록 조회 API"
    )
    ApiResponse<PublicBlogFeedPostResponse> getBlogPosts(
            @Parameter(description = "블로그 slug", example = "rilog-team")
            @PathVariable String slug,
            @Parameter(hidden = true) @NullableLoginUserId Long requesterId,
            @Parameter(description = "게시글 카테고리", example = "TECH")
            @RequestParam(required = false) Category category,
            @Parameter(description = "챕터 ID", example = "1")
            @RequestParam(required = false) Long chapterId,
            @Parameter(description = "Rilog 소유자가 글을 작성한 대상 Colog slug", example = "rilog-team")
            @RequestParam(required = false) String targetCologSlug,
            @RequestParam int page,
            @RequestParam int size
    );

}
