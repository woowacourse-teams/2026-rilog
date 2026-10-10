package kr.rilog.domain.notification.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.notification.controller.dto.response.NotificationListResponse;
import kr.rilog.domain.notification.controller.dto.response.NotificationUnreadCountResponse;
import kr.rilog.domain.notification.service.dto.command.NotificationFilter;
import kr.rilog.global.response.ApiResponse;

@Tag(name = "Notification API")
public interface NotificationApiSpec {

    @Operation(
            summary = "알림 목록 조회",
            description = """
                    로그인한 사용자의 알림을 최신순(createdAt, id 내림차순)으로 조회합니다.
                    sourceStatus는 알림 출처의 내용을 보여줄 수 없는 이유를 나타냅니다.
                    출처가 삭제된 경우에는 삭제 상태를 화면에 표시할 수 있도록 content를 함께 내려줍니다.
                    출처에 접근할 수 없거나, 공개되지 않았거나, 찾을 수 없는 경우에는 content가 null입니다.
                    """
    )
    ApiResponse<NotificationListResponse> readNotifications(
            @Parameter(hidden = true) @LoginUserId Long recipientId,
            @Parameter(description = "조회 범위 (ALL: 전체, UNREAD: 읽지 않은 알림만)", example = "ALL")
            NotificationFilter filter,
            @Parameter(description = "페이지 번호 (0부터 시작)", example = "0")
            int page,
            @Parameter(description = "한 페이지에 조회할 알림 개수", example = "20")
            int size
    );

    @Operation(
            summary = "읽지 않은 알림 수 조회",
            description = """
                    로그인한 사용자의 읽지 않은 알림 개수를 조회합니다.
                    출처가 삭제되었거나 접근할 수 없는 알림도 읽지 않았다면 개수에 포함합니다.
                    """
    )
    ApiResponse<NotificationUnreadCountResponse> countUnreadNotifications(
            @Parameter(hidden = true) @LoginUserId Long recipientId
    );

    @Operation(
            summary = "알림 단건 읽음 처리",
            description = """
                    알림 하나를 읽음 상태로 변경합니다.
                    이미 읽은 알림은 처음 읽은 시각(readAt)을 그대로 유지합니다.
                    알림이 없거나 본인의 알림이 아니면 NOTIFICATION_NOT_FOUND로 응답합니다.
                    """
    )
    ApiResponse<Void> readNotification(
            @Parameter(hidden = true) @LoginUserId Long recipientId,
            @Parameter(description = "읽음 처리할 알림 ID", example = "1")
            Long notificationId
    );

    @Operation(
            summary = "알림 전체 읽음 처리",
            description = """
                    로그인한 사용자의 읽지 않은 알림을 모두 읽음 상태로 변경합니다.
                    이미 읽은 알림은 처음 읽은 시각(readAt)을 그대로 유지합니다.
                    """
    )
    ApiResponse<Void> readAllNotifications(
            @Parameter(hidden = true) @LoginUserId Long recipientId
    );
}
