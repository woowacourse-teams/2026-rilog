package kr.rilog.domain.blog.controller;

import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.apispec.BlogApiSpec;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.service.BlogService;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("v1")
@RequiredArgsConstructor
public class BlogController implements BlogApiSpec {

    private final BlogService blogService;

    @GetMapping("/users/me/cologs/preview")
    public ApiResponse<List<MyCologResponse>> getMyCologsPreview(@LoginUserId Long requesterId) {
        List<MyCologResponse> data = blogService.getMyCologsPreview(requesterId);
        return ApiResponse.response(HttpStatus.OK, "나의 팀 목록을 조회합니다.", data);
    }

}
