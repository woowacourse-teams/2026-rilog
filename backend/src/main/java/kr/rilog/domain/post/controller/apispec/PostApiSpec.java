package kr.rilog.domain.post.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.auth.annotation.OptionalAuthGuard;
import kr.rilog.domain.post.controller.dto.request.PostPublishRequest;
import kr.rilog.domain.post.controller.dto.request.PostUpdateRequest;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.PostPublishResponse;
import kr.rilog.domain.post.controller.dto.response.PostUpdateResponse;
import kr.rilog.domain.post.controller.dto.response.TotalPostsCountResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
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
    ApiResponse<PostPublishResponse> create(
            @Parameter(description = "게시글을 발행할 블로그 Slug", example = "team-rilog")
            @PathVariable String slug,
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Valid @RequestBody PostPublishRequest request
    );

    @GetMapping("/posts/{postId}")
    @OptionalAuthGuard
    @Operation(
            summary = "게시글 상세 조회 API",
            description = "게시글 ID로 게시글 상세 정보를 조회합니다. 소속 블로그 유형에 따라 owner 응답이 달라집니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "게시글 상세 조회 성공",
            useReturnTypeSchema = true,
            content = @Content(
                    mediaType = MediaType.APPLICATION_JSON_VALUE,
                    examples = {
                            @ExampleObject(
                                    name = "RILOG",
                                    summary = "개인 블로그 게시글",
                                    description = "개인 블로그에 소속된 게시글의 상세 응답입니다.",
                                    value = PostDetailResponseExamples.RILOG
                            ),
                            @ExampleObject(
                                    name = "COLOG",
                                    summary = "팀 블로그 게시글",
                                    description = "팀 블로그에 소속된 게시글로, 활성 멤버 수와 공개 게시글 수를 포함합니다.",
                                    value = PostDetailResponseExamples.COLOG
                            )
                    }
            )
    )
    ApiResponse<PostDetailResponse> getPostDetails(
            @Parameter(description = "게시글 ID", example = "1")
            @PathVariable Long postId,
            @Parameter(hidden = true) @NullableLoginUserId Long requesterId
    );

    @Operation(
            summary = "전체 게시글 수 조회 API",
            description = "발행된 공개 게시글 수를 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "전체 게시글 수 조회 성공"
    )
    ApiResponse<TotalPostsCountResponse> getPostCount();

    @Operation(
            summary = "발행된 게시글 수정 API",
            description = "발행된 게시글을 수정합니다."
    )
    ApiResponse<PostUpdateResponse> updatePost(
            @PathVariable Long postId,
            @LoginUserId Long requesterId,
            @Valid @RequestBody PostUpdateRequest dto
    );

}
