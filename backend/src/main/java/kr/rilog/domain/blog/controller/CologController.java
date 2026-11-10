package kr.rilog.domain.blog.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.apispec.CologApiSpec;
import kr.rilog.domain.blog.controller.dto.request.CologCreateRequest;
import kr.rilog.domain.blog.controller.dto.request.CologMemberInviteRequest;
import kr.rilog.domain.blog.controller.dto.request.CologMemberUpdateRequest;
import kr.rilog.domain.blog.controller.dto.response.BlogMemberResponse;
import kr.rilog.domain.blog.controller.dto.response.CologCreateResponse;
import kr.rilog.domain.blog.controller.dto.response.CologMemberInviteResponse;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.service.CologCommandService;
import kr.rilog.domain.blog.service.CologQueryService;
import kr.rilog.domain.blog.service.dto.result.BlogMemberResult;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class CologController implements CologApiSpec {

    private final CologCommandService cologCommandService;

    private final CologQueryService cologQueryService;

    @AuthGuard
    @PostMapping("/cologs")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CologCreateResponse> create(
            @LoginUserId Long requesterId,
            @Valid @RequestBody CologCreateRequest request
    ) {
        CologCreateResult result = cologCommandService.create(requesterId, request.toCommand());
        CologCreateResponse data = CologCreateResponse.from(result);
        return ApiResponse.response(HttpStatus.CREATED, "팀 블로그가 생성되었습니다.", data);
    }

    @AuthGuard
    @PostMapping("/cologs/{slug}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CologMemberInviteResponse> inviteMember(
            @LoginUserId Long requesterId,
            @PathVariable("slug") String slug,
            @Valid @RequestBody CologMemberInviteRequest request
    ) {
        CologMemberInviteResult result = cologCommandService.inviteMember(requesterId, slug, request.toCommand());
        CologMemberInviteResponse data = CologMemberInviteResponse.from(result);
        return ApiResponse.response(HttpStatus.CREATED, "팀 멤버가 초대되었습니다.", data);
    }

    @AuthGuard
    @DeleteMapping("/cologs/{slug}")
    public ApiResponse<Void> deleteColog(
            @LoginUserId Long requesterId,
            @PathVariable("slug") String slug
    ) {
        cologCommandService.deleteColog(requesterId, slug);
        return ApiResponse.response(HttpStatus.NO_CONTENT, "팀 블로그를 삭제했습니다.");
    }

    @AuthGuard
    @DeleteMapping("/cologs/{slug}/members/me")
    public ApiResponse<Void> leaveColog(
            @LoginUserId Long requesterId,
            @PathVariable("slug") String slug
    ) {
        cologCommandService.leaveColog(requesterId, slug);
        return ApiResponse.response(HttpStatus.NO_CONTENT, "팀 블로그에서 탈퇴했습니다.");
    }

    @AuthGuard
    @DeleteMapping("/cologs/{slug}/members/{memberId}")
    public ApiResponse<Void> removeMember(
            @LoginUserId Long requesterId,
            @PathVariable("slug") String slug,
            @PathVariable("memberId") Long memberId
    ) {
        cologCommandService.removeMember(requesterId, slug, memberId);
        return ApiResponse.response(HttpStatus.NO_CONTENT, "팀 멤버를 내보냈습니다.");
    }

    @AuthGuard
    @PatchMapping("/cologs/{slug}/members/{memberId}")
    public ApiResponse<Void> updateMember(
            @LoginUserId Long requesterId,
            @PathVariable("slug") String slug,
            @PathVariable("memberId") Long memberId,
            @Valid @RequestBody CologMemberUpdateRequest request
    ) {
        cologCommandService.updateMember(requesterId, slug, memberId, request.toCommand());
        return ApiResponse.response(HttpStatus.OK, "팀 멤버 정보를 수정했습니다.");
    }

    @GetMapping("/cologs/{slug}/members")
    public ApiResponse<List<BlogMemberResponse>> getCologMembers(@PathVariable("slug") String slug) {
        List<BlogMemberResult> results = cologQueryService.getCologMembers(slug);
        List<BlogMemberResponse> data = results.stream()
                .map(BlogMemberResponse::from)
                .toList();

        return ApiResponse.response(HttpStatus.OK, "팀 멤버 목록 조회에 성공했습니다.", data);
    }

    @AuthGuard
    @GetMapping("/users/me/cologs/overview")
    public ApiResponse<List<MyCologResponse>> getMyCologsOverview(@LoginUserId Long requesterId) {
        List<MyCologResponse> data = cologQueryService.getMyCologsOverview(requesterId);
        return ApiResponse.response(HttpStatus.OK, "나의 팀 목록을 조회합니다.", data);
    }

}
