package kr.rilog.domain.admin.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.admin.controller.dto.request.AdminPostImportRequest;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.post.controller.dto.response.PostPublishResponse;
import kr.rilog.domain.upload.controller.dto.request.PreSignedUrlCreateRequest;
import kr.rilog.domain.upload.controller.dto.response.PresignedUrlCreateResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "관리자 게시글 이관 API")
public interface AdminPostImportApiSpec {

    @Operation(summary = "대상 작성자 명의 이미지 업로드 URL 발급", description = """
            ADMIN ACCESS 토큰만 허용합니다. 가입한 대상 작성자와 미삭제 개인 블로그가 필요합니다.
            type은 IMAGE만 허용하며 기존 업로드 응답과 필수 헤더를 그대로 사용합니다.
            이미지 키와 자산의 업로더는 targetUserId입니다.
            """)
    ApiResponse<PresignedUrlCreateResponse> createUploadUrl(
            @Parameter(description = "대상 작성자 ID") @PathVariable Long targetUserId,
            @Valid @RequestBody PreSignedUrlCreateRequest request
    );

    @Operation(summary = "대상 작성자 명의 원문 게시글 이관", description = """
            ADMIN ACCESS 토큰만 허용합니다. slug는 대상 작성자의 개인 Rilog 또는 활성 멤버인 Colog입니다.
            기존 GET /v1/blogs/{개인 Rilog slug}/index의 cologIndexes로 발행 위치를 선택할 수 있습니다.
            본문 이미지와 원문 썸네일을 대상 작성자 명의로 업로드한 뒤 호출합니다.
            본문 이미지에는 지원하는 S3 조회 URL, 썸네일에는 객체 키 또는 같은 조회 URL을 사용할 수 있습니다.
            원문 최초 발행 일시는 offset을 포함해야 하며 기존 STANDARD 게시글과 같은 JVM 시간대로 저장합니다.
            썸네일이 없으면 null, chapterId는 생략하거나 null로 전달합니다.
            visibility는 PUBLIC/PRIVATE를 지원하며 현재 플러그인은 PUBLIC을 전송합니다.
            응답 유실 시 자동 재전송하지 말고 실제 생성 여부를 확인해야 합니다.
            """)
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "게시글 이관 성공")
    ApiResponse<PostPublishResponse> publish(
            @Parameter(hidden = true) @LoginUserId Long operatorId,
            @Parameter(description = "대상 작성자 ID") @PathVariable Long targetUserId,
            @Valid @RequestBody AdminPostImportRequest request
    );
}
