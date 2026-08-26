package kr.rilog.domain.post.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.auth.annotation.OptionalAuthGuard;
import kr.rilog.domain.post.controller.dto.request.PostPublishRequest;
import kr.rilog.domain.post.controller.dto.request.PostUpdateRequest;
import kr.rilog.domain.post.controller.dto.response.*;
import kr.rilog.domain.post.controller.apispec.PostApiSpec;
import kr.rilog.domain.post.service.PostService;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.post.service.dto.result.PostUpdateResult;
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
    @PostMapping("/posts")
    public ApiResponse<PostPublishResponse> create(
            @LoginUserId Long requesterId,
            @Valid @RequestBody PostPublishRequest request
    ) {
        PostPublishResult result = postService.publish(request.toCommand(), requesterId);
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

    @AuthGuard
    @PutMapping("/posts/{postId}")
    public ApiResponse<PostUpdateResponse> updatePost(
            @PathVariable Long postId,
            @LoginUserId Long requesterId,
            @Valid @RequestBody PostUpdateRequest dto
    ) {
        PostUpdateResult result = postService.update(dto.toCommand(), postId, requesterId);
        PostUpdateResponse data = PostUpdateResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "게시글을 수정했습니다.", data);
    }

    @AuthGuard
    @DeleteMapping("/posts/{postId}")
    public ApiResponse<Void> deletePublishedPost(
            @PathVariable Long postId,
            @LoginUserId Long requesterId
    ) {
        postService.deletePublishedPost(postId, requesterId);
        return ApiResponse.response(HttpStatus.OK, "게시글을 삭제했습니다.");
    }


}
