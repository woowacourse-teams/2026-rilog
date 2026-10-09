package kr.rilog.domain.notification.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.notification.controller.dto.response.NotificationListResponse;
import kr.rilog.domain.notification.service.dto.command.NotificationFilter;
import kr.rilog.global.response.ApiResponse;

@Tag(name = "Notification API")
public interface NotificationApiSpec {

    @Operation(
            summary = "Read notifications",
            description = """
                    Reads notifications ordered by createdAt and id descending.
                    The source status describes why source content is unavailable.
                    Deleted sources retain content so the client can render a deleted state.
                    Content is omitted for inaccessible, unpublished, or missing sources.
                    """
    )
    ApiResponse<NotificationListResponse> readNotifications(
            @Parameter(hidden = true) @LoginUserId Long recipientId,
            @Parameter(description = "ALL or UNREAD", example = "ALL")
            NotificationFilter filter,
            @Parameter(description = "Zero-based page number", example = "0")
            int page,
            @Parameter(description = "Page size", example = "20")
            int size
    );
}