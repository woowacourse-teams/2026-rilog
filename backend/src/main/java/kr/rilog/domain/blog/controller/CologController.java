package kr.rilog.domain.blog.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.apispec.CologApiSpec;
import kr.rilog.domain.blog.controller.dto.request.CologCreateRequest;
import kr.rilog.domain.blog.controller.dto.request.CologMemberInviteRequest;
import kr.rilog.domain.blog.controller.dto.response.CologCreateResponse;
import kr.rilog.domain.blog.controller.dto.response.CologMemberInviteResponse;
import kr.rilog.domain.blog.service.CologService;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

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

}
