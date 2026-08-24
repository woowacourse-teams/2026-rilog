package kr.rilog.domain.post.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.auth.annotation.OptionalAuthGuard;
import kr.rilog.domain.post.controller.dto.request.PostPublishRequest;
import kr.rilog.domain.post.controller.dto.response.*;
import kr.rilog.domain.post.controller.apispec.PostApiSpec;
import kr.rilog.domain.post.service.PostService;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class PostController implements PostApiSpec {

    private final PostService postService;

    @AuthGuard
    @ResponseStatus(HttpStatus.CREATED)
    @PostMapping("/blogs/{slug}/posts")
    public ApiResponse<PostPublishResponse> create(
            @PathVariable String slug,
            @LoginUserId Long requesterId,
            @Valid @RequestBody PostPublishRequest request
    ) {
        PostPublishResult result = postService.publish(request.toCommand(), slug, requesterId);
        PostPublishResponse data = PostPublishResponse.from(result);
        return ApiResponse.response(HttpStatus.CREATED, "게시글이 발행되었습니다.", data);
    }

    @OptionalAuthGuard
    @GetMapping("/posts/{postId}")
    public ApiResponse<PostDetailResponse> getPostDetails(
            @PathVariable Long postId,
            @NullableLoginUserId Long requesterId
    ) {
        PostDetailResponse data = postService.readPostOfBlogs(postId, requesterId);
        return ApiResponse.response(HttpStatus.OK, "게시글 상세 조회에 성공했습니다.", data);
    }

    @GetMapping("/posts/count")
    public ApiResponse<TotalPostsCountResponse> getPostCount() {
        TotalPostsCountResponse data = postService.readPostsCount();
        return ApiResponse.response(HttpStatus.OK, "전체 게시글 수 조회에 성공했습니다.", data);
    }

}
