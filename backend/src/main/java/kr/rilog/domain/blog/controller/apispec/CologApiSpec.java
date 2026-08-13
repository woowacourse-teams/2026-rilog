package kr.rilog.domain.blog.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.dto.request.CologCreateRequest;
import kr.rilog.domain.blog.controller.dto.request.CologMemberInviteRequest;
import kr.rilog.domain.blog.controller.dto.response.CologCreateResponse;
import kr.rilog.domain.blog.controller.dto.response.CologDetailResponse;
import kr.rilog.domain.blog.controller.dto.response.CologMemberInviteResponse;
import kr.rilog.domain.blog.controller.dto.response.CologProfileResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "팀 블로그 API")
public interface CologApiSpec {

    @Operation(
            summary = "팀 상세 조회 API",
            description = "팀 블로그 상세 화면에서 사용할 팀 정보를 slug 기준으로 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "팀 상세 조회 성공"
    )
    ApiResponse<CologDetailResponse> getDetail(
            @Parameter(description = "팀 블로그 slug", example = "rilog-team")
            @PathVariable("slug") String slug
    );

    @Operation(
            summary = "팀 프로필 조회 API",
            description = "팀 블로그 프로필 영역에서 사용할 최소 정보를 slug 기준으로 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "팀 프로필 조회 성공"
    )
    ApiResponse<CologProfileResponse> getProfile(
            @Parameter(description = "팀 블로그 slug", example = "rilog-team")
            @PathVariable("slug") String slug
    );

    @Operation(
            summary = "팀 생성 API",
            description = "팀 블로그를 생성하고 요청자를 OWNER 멤버로 등록합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "201",
            description = "팀 블로그 생성 성공"
    )
    ApiResponse<CologCreateResponse> create(
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Valid @RequestBody CologCreateRequest request
    );

    @Operation(
            summary = "팀 멤버 초대 API",
            description = "팀 블로그에 사용자를 멤버로 등록합니다. OWNER 또는 ADMIN 권한의 팀 멤버만 요청할 수 있습니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "201",
            description = "팀 멤버 초대 성공"
    )
    ApiResponse<CologMemberInviteResponse> inviteMember(
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @PathVariable("cologId") Long cologId,
            @Valid @RequestBody CologMemberInviteRequest request
    );

}
