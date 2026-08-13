package kr.rilog.domain.post.controller;

import kr.rilog.domain.post.controller.apispec.FeedApiSpec;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.service.FeedService;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class FeedController implements FeedApiSpec {

    private final FeedService feedService;

    @GetMapping("/feeds/posts")
    public ApiResponse<FullFeedPostResponse> readFullFeedPosts(
            @RequestParam int page,
            @RequestParam int size
    ) {
        FullFeedPostResponse data = feedService.getFullFeedPostList(page, size);
        return ApiResponse.response(HttpStatus.OK, "전체피드의 게시물 목록 조회에 성공했습니다.", data);
    }

}
