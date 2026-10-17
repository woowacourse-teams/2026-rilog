package kr.rilog.domain.post.controller;

import jakarta.servlet.http.HttpServletResponse;
import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.auth.annotation.OptionalAuthGuard;
import kr.rilog.domain.post.controller.apispec.PostViewApiSpec;
import kr.rilog.domain.post.service.PostViewRegistrationService;
import kr.rilog.domain.post.view.ViewerCookieResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class PostViewController implements PostViewApiSpec {

    private final PostViewRegistrationService service;
    private final ViewerCookieResolver viewerCookieResolver;

    @Override
    @OptionalAuthGuard
    @PostMapping("/posts/{postId}/views")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void registerView(
            @PathVariable Long postId,
            @NullableLoginUserId Long requesterId,
            @CookieValue(name = ViewerCookieResolver.COOKIE_NAME, required = false) String visitorCookie, HttpServletResponse response
    ) {
        var viewer = viewerCookieResolver.resolve(requesterId, visitorCookie);
        service.register(postId, requesterId, viewer.identity());
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        if (viewer.cookie() != null) {
            response.addHeader(HttpHeaders.SET_COOKIE, viewer.cookie().toString());
        }
    }
}
