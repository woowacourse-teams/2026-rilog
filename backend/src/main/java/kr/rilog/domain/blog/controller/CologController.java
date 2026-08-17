package kr.rilog.domain.blog.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.apispec.CologApiSpec;
import kr.rilog.domain.blog.controller.dto.request.CologCreateRequest;
import kr.rilog.domain.blog.controller.dto.request.CologMemberInviteRequest;
import kr.rilog.domain.blog.controller.dto.response.CologCreateResponse;
import kr.rilog.domain.blog.controller.dto.response.CologMemberInviteResponse;
import kr.rilog.domain.blog.controller.dto.response.CologPublicProfileResponse;
import kr.rilog.domain.blog.service.CologService;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.domain.blog.service.dto.result.CologPublicProfileResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class CologController implements CologApiSpec {

    private final CologService cologService;

    @GetMapping("/blogs/@{slug}")
    public ApiResponse<CologPublicProfileResponse> getPublicProfile(@PathVariable("slug") String slug) {
        CologPublicProfileResult result = cologService.getPublicProfile(slug);
        CologPublicProfileResponse data = CologPublicProfileResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "공개 프로필 조회에 성공했습니다.", data);
    }

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
    @PostMapping("/cologs/{cologId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CologMemberInviteResponse> inviteMember(
            @LoginUserId Long requesterId,
            @PathVariable("cologId") Long cologId,
            @Valid @RequestBody CologMemberInviteRequest request
    ) {
        CologMemberInviteResult result = cologService.inviteMember(requesterId, cologId, request.toCommand());
        CologMemberInviteResponse data = CologMemberInviteResponse.from(result);
        return ApiResponse.response(HttpStatus.CREATED, "팀 멤버가 초대되었습니다.", data);
    }

}
