package kr.rilog.domain.notification.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.notification.service.content.InlineCommentNotificationContent;
import kr.rilog.domain.notification.service.content.NotificationContent;

@Schema(oneOf = {InlineCommentNotificationContentResponse.class})
public sealed interface NotificationContentResponse permits InlineCommentNotificationContentResponse {

    static NotificationContentResponse from(NotificationContent content) {
        return switch (content) {
            case InlineCommentNotificationContent inlineComment -> InlineCommentNotificationContentResponse.from(inlineComment);
        };
    }
}
