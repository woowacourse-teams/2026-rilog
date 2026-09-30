package kr.rilog.domain.post.controller;

import kr.rilog.domain.auth.annotation.OptionalAuthGuard;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.controller.apispec.TrendingApiSpec;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.service.TrendingService;
import kr.rilog.domain.post.service.dto.command.FullFeedSearchCommand;
import kr.rilog.domain.post.service.dto.result.FullFeedPostResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class TrendingController implements TrendingApiSpec {

    private final TrendingService trendingService;

    @OptionalAuthGuard
    @GetMapping("/feeds/trending/posts")
    public ApiResponse<FullFeedPostResponse> readTrendingPosts(
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) BlogType blogType,
            @RequestParam int page,
            @RequestParam int size
    ) {
        FullFeedSearchCommand command = new FullFeedSearchCommand(category, blogType, page, size);
        FullFeedPostResult result = trendingService.readTrendingPostList(command);
        FullFeedPostResponse data = FullFeedPostResponse.from(result);

        return ApiResponse.response(HttpStatus.OK, "트렌딩 피드의 게시물 목록 조회에 성공했습니다.", data);
    }
}
