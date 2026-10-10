package kr.rilog.domain.notification.service.content;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationSourceStatusTest {

    @ParameterizedTest
    @EnumSource(
            value = NotificationSourceStatus.class,
            names = {
                    "AVAILABLE",
                    "POST_DELETED",
                    "COMMENT_DELETED",
                    "ACTOR_DELETED",
                    "POST_INACCESSIBLE"
            }
    )
    @DisplayName("조회 가능한 출처, 삭제된 출처와 접근할 수 없는 출처는 알림 콘텐츠를 노출한다.")
    void exposableSourceStatusCanExposeContent(NotificationSourceStatus status) {
        assertThat(status.canExposeContent()).isTrue();
    }

    @ParameterizedTest
    @EnumSource(
            value = NotificationSourceStatus.class,
            names = {
                    "POST_UNAVAILABLE",
                    "SOURCE_NOT_FOUND"
            }
    )
    @DisplayName("이용할 수 없거나 찾을 수 없는 출처는 알림 콘텐츠를 노출하지 않는다.")
    void hiddenSourceStatusCannotExposeContent(NotificationSourceStatus status) {
        assertThat(status.canExposeContent()).isFalse();
    }
}
