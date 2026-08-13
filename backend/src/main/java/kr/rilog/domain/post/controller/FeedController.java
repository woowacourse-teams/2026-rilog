package kr.rilog.domain.post.controller;

import kr.rilog.domain.post.controller.apispec.FeedApiSpec;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.service.FeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class FeedController implements FeedApiSpec {

    private final FeedService feedService;

    @GetMapping("/feeds/posts")
    public ResponseEntity<FullFeedPostResponse> readFullFeedPosts(
            @RequestParam int page,
            @RequestParam int size
    ) {
        FullFeedPostResponse data = feedService.getFullFeedPostList(page, size);
        return ResponseEntity.ok(data);
    }

}
