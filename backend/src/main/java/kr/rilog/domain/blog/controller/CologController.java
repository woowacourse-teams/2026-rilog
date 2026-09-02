package kr.rilog.domain.blog.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.apispec.CologApiSpec;
import kr.rilog.domain.blog.controller.dto.request.CologCreateRequest;
import kr.rilog.domain.blog.controller.dto.request.CologMemberInviteRequest;
import kr.rilog.domain.blog.controller.dto.response.CologCreateResponse;
import kr.rilog.domain.blog.controller.dto.response.CologMemberInviteResponse;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.service.CologService;
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

    private final CologService cologService;

    @AuthGuard
    @PostMapping("/cologs")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CologCreateResponse> create(
            @LoginUserId Long requesterId,
            @Valid @RequestBody CologCreateRequest request
    ) {
        CologCreateResult result = cologService.create(requesterId, request.toCommand());
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
        CologMemberInviteResult result = cologService.inviteMember(requesterId, slug, request.toCommand());
        CologMemberInviteResponse data = CologMemberInviteResponse.from(result);
        return ApiResponse.response(HttpStatus.CREATED, "팀 멤버가 초대되었습니다.", data);
    }

    @AuthGuard
    @DeleteMapping("/cologs/{slug}")
    public ApiResponse<Void> deleteColog(
            @LoginUserId Long requesterId,
            @PathVariable("slug") String slug
    ) {
        cologService.deleteColog(requesterId, slug);
        return ApiResponse.response(HttpStatus.NO_CONTENT, "팀 블로그를 삭제했습니다.");
    }

    @AuthGuard
    @DeleteMapping("/cologs/{slug}/members/me")
    public ApiResponse<Void> leaveColog(
            @LoginUserId Long requesterId,
            @PathVariable("slug") String slug
    ) {
        cologService.leaveColog(requesterId, slug);
        return ApiResponse.response(HttpStatus.NO_CONTENT, "팀 블로그에서 탈퇴했습니다.");
    }

    @AuthGuard
    @DeleteMapping("/cologs/{slug}/members/{memberId}")
    public ApiResponse<Void> removeMember(
            @LoginUserId Long requesterId,
            @PathVariable("slug") String slug,
            @PathVariable("memberId") Long memberId
    ) {
        cologService.removeMember(requesterId, slug, memberId);
        return ApiResponse.response(HttpStatus.NO_CONTENT, "팀 멤버를 내보냈습니다.");
    }

    @AuthGuard
    @GetMapping("/users/me/cologs/overview")
    public ApiResponse<List<MyCologResponse>> getMyCologsOverview(@LoginUserId Long requesterId) {
        List<MyCologResponse> data = cologService.getMyCologsOverview(requesterId);
        return ApiResponse.response(HttpStatus.OK, "나의 팀 목록을 조회합니다.", data);
    }

}
