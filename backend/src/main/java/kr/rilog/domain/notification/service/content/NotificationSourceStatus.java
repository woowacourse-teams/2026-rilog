package kr.rilog.domain.notification.service.content;

public enum NotificationSourceStatus {
    AVAILABLE,
    POST_DELETED,
    COMMENT_DELETED,
    ACTOR_DELETED,
    POST_UNAVAILABLE,
    POST_INACCESSIBLE,
    SOURCE_NOT_FOUND,
    ;

    public boolean canExposeContent() {
        return switch (this) {
            case AVAILABLE,
                 POST_DELETED,
                 COMMENT_DELETED,
                 ACTOR_DELETED,
                 POST_INACCESSIBLE -> true;
            case POST_UNAVAILABLE,
                 SOURCE_NOT_FOUND -> false;
        };
    }
}
