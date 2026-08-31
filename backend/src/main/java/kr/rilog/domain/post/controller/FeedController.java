package kr.rilog.domain.post.controller;

import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.auth.annotation.OptionalAuthGuard;
import kr.rilog.domain.post.controller.apispec.FeedApiSpec;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.BlogFeedPostResponse;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.service.FeedService;
import kr.rilog.domain.post.service.dto.command.BlogFeedSearchCommand;
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
        FullFeedPostResponse data = feedService.readFullFeedPostList(page, size);
        return ApiResponse.response(HttpStatus.OK, "전체피드의 게시물 목록 조회에 성공했습니다.", data);
    }

    @OptionalAuthGuard
    @GetMapping("/blogs/{slug}/posts")
    public ApiResponse<BlogFeedPostResponse> getBlogPosts(
            @PathVariable String slug,
            @NullableLoginUserId Long requesterId,
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) Long chapterId,
            @RequestParam(required = false) String targetCologSlug,
            @RequestParam int page,
            @RequestParam int size
    ) {
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(
                category,
                chapterId,
                targetCologSlug,
                page,
                size
        );
        BlogFeedPostResponse data = feedService.readBlogPosts(slug, requesterId, command);
        return ApiResponse.response(HttpStatus.OK, "블로그 게시글 목록 조회에 성공했습니다.", data);
    }

}
