package kr.rilog.domain.post.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.post.controller.dto.request.PostPublishRequest;
import kr.rilog.domain.post.controller.dto.response.PostPublishResponse;
import kr.rilog.domain.post.controller.dto.response.TotalPostsCountResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "게시글 API")
public interface PostApiSpec {

    @Operation(
            summary = "게시글 발행 API",
            description = "개인 블로그 또는 팀 블로그에 게시글을 발행합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "201",
            description = "게시글 발행 성공"
    )
    ApiResponse<PostPublishResponse> publish(
            @Parameter(description = "게시글을 발행할 블로그 ID", example = "1")
            @PathVariable Long blogId,
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Valid @RequestBody PostPublishRequest request
    );

    @Operation(
            summary = "전체 게시글 수 조회 API",
            description = "발행된 공개 게시글 수를 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "전체 게시글 수 조회 성공"
    )
    ApiResponse<TotalPostsCountResponse> getPostsCount();
}
