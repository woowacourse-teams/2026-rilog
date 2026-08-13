package kr.rilog.domain.post.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.post.controller.dto.request.PostPublishRequest;
import kr.rilog.domain.post.controller.dto.response.PostPublishResponse;
import kr.rilog.domain.post.controller.dto.response.TotalPostsCountResponse;
import kr.rilog.domain.post.service.PostService;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping("/blogs/{blogId}/posts")
    public ResponseEntity<PostPublishResponse> publish(
            @PathVariable Long blogId,
            @LoginUserId Long requesterId,
            @Valid @RequestBody PostPublishRequest request
    ) {
        PostPublishResult result = postService.publish(request.toCommand(), blogId, requesterId);
        PostPublishResponse data = PostPublishResponse.from(result);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(data);
    }

    @GetMapping("/posts/count")
    public ResponseEntity<TotalPostsCountResponse> getPostsCount() {
        TotalPostsCountResponse data = postService.readPostsCount();
        return ResponseEntity.ok(data);
    }

}
