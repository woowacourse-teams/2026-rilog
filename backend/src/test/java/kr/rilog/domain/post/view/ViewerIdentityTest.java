package kr.rilog.domain.post.view;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ViewerIdentityTest {

    @Test
    @DisplayName("회원 ID와 익명 UUID는 각각 동일한 독자를 식별한다")
    void identitiesAreStableAndSeparated() {
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000001");
        assertThat(ViewerIdentity.member(1)).isEqualTo(ViewerIdentity.member(1));
        assertThat(ViewerIdentity.anonymous(id)).isEqualTo(ViewerIdentity.anonymous(id));
        assertThat(ViewerIdentity.member(1)).isNotEqualTo(ViewerIdentity.member(2))
                .isNotEqualTo(ViewerIdentity.anonymous(id));
    }

    @Test
    @DisplayName("유효하지 않은 회원 ID는 집계 식별자로 사용할 수 없다")
    void rejectsInvalidMemberId() {
        assertThatThrownBy(() -> ViewerIdentity.member(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ViewerIdentity.member(-1)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("익명 UUID 누락은 독자 식별자로 사용할 수 없다")
    void rejectsMissingAnonymousId() {
        assertThatThrownBy(() -> ViewerIdentity.anonymous(null)).isInstanceOf(NullPointerException.class);
    }
}
