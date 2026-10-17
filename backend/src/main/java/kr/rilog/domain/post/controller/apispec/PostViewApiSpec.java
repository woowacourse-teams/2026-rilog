package kr.rilog.domain.post.controller.apispec;

import jakarta.servlet.http.HttpServletResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.post.view.ViewerCookieResolver;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PathVariable;

@Tag(name = "게시글 API")
public interface PostViewApiSpec {

    @Operation(
            summary = "게시글 조회 등록",
            description = "실제 상세 진입 시 호출합니다. 본인 방문은 제외하고 다른 독자의 같은 글 조회는 마지막 인정부터 1시간에 한 번 집계합니다. 중복도 204이며 조회수 본문은 반환하지 않습니다. GET·prefetch는 집계하지 않습니다. DB 저장 연결 전 등록은 기본 비활성(503)입니다."
    )
    @ApiResponse(responseCode = "204", description = "조회 처리 완료. 새 비회원에게만 방문자 쿠키를 발급합니다.")
    void registerView(
            @PathVariable Long postId,
            @Parameter(hidden = true) @NullableLoginUserId Long requesterId,
            @Parameter(hidden = true) @CookieValue(name = ViewerCookieResolver.COOKIE_NAME, required = false) String visitorCookie,
            @Parameter(hidden = true) HttpServletResponse response
    );
}
