package kr.rilog.domain.blog.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.dto.request.CologCreateRequest;
import kr.rilog.domain.blog.controller.dto.request.CologMemberInviteRequest;
import kr.rilog.domain.blog.controller.dto.response.CologCreateResponse;
import kr.rilog.domain.blog.controller.dto.response.CologMemberInviteResponse;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@Tag(name = "팀 블로그 API")
public interface CologApiSpec {

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
            @Parameter(description = "멤버를 초대할 팀 블로그 slug", example = "rilog-team")
            @PathVariable("slug") String slug,
            @Valid @RequestBody CologMemberInviteRequest request
    );

    @Operation(
            summary = "팀 블로그 탈퇴 API",
            description = "요청자가 ACTIVE 멤버인 팀 블로그에서 탈퇴합니다. OWNER는 바로 탈퇴할 수 없습니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "204",
            description = "팀 블로그 탈퇴 성공"
    )
    ApiResponse<Void> leaveColog(
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Parameter(description = "탈퇴할 팀 블로그 slug", example = "rilog-team")
            @PathVariable("slug") String slug
    );

    @Operation(
            summary = "팀 멤버 내보내기 API",
            description = "OWNER는 ADMIN과 MEMBER를, ADMIN은 MEMBER를 팀 블로그에서 내보낼 수 있습니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "204",
            description = "팀 멤버 내보내기 성공"
    )
    ApiResponse<Void> removeMember(
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Parameter(description = "멤버를 내보낼 팀 블로그 slug", example = "rilog-team")
            @PathVariable("slug") String slug,
            @Parameter(description = "내보낼 팀 멤버 ID", example = "3")
            @PathVariable("memberId") Long memberId
    );

    @Operation(description = "나의 블로그 목록 요약 조회 API", summary = "나의 블로그 목록 요약 조회 API")
    ApiResponse<List<MyCologResponse>> getMyCologsPreview(@LoginUserId Long requesterId);

}
