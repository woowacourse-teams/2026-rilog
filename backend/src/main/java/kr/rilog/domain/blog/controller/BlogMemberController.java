package kr.rilog.domain.blog.controller;

import kr.rilog.domain.blog.controller.apispec.BlogMemberApiSpec;
import kr.rilog.domain.blog.controller.dto.response.BlogMemberResponse;
import kr.rilog.domain.blog.service.BlogMemberService;
import kr.rilog.domain.blog.service.dto.result.BlogMemberResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class BlogMemberController implements BlogMemberApiSpec {

    private final BlogMemberService blogMemberService;

    @GetMapping("/cologs/{slug}/members")
    public ApiResponse<List<BlogMemberResponse>> getCologMembers(@PathVariable("slug") String slug) {
        List<BlogMemberResult> results = blogMemberService.getCologMembers(slug);
        List<BlogMemberResponse> data = results.stream()
                .map(BlogMemberResponse::from)
                .toList();

        return ApiResponse.response(HttpStatus.OK, "팀 멤버 목록 조회에 성공했습니다.", data);
    }

}
