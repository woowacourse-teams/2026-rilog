package kr.rilog.domain.post.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;

public interface FeedApiSpec {

    @Operation(
            description = "전체 피드 게시물 목록 조회 API",
            summary = "전체 피드 게시물 목록 조회 API"
    )
    ResponseEntity<FullFeedPostResponse> readFullFeedPosts(
            @RequestParam int page,
            @RequestParam int size
    );

}
